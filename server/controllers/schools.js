import School from "../models/School.js";
import { AppError, createValidationError } from "../utils/errors.js";
import { sendApiResponse } from "../utils/response.js";
import { isDatabaseConnected } from "../utils/fallbackData.js";
import { applyInMemoryListQuery, escapeRegExp, parseListQuery } from "../utils/queryOptions.js";
import { createRuntimeId, getRuntimeCollection } from "../utils/runtimeStore.js";

const toNumber = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createValidationError([{ field: fieldName, message: `${fieldName} must be a valid non-negative number.` }]);
  }

  return parsed;
};

const parseFacilities = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseSchoolPayload = (body, { partial = false } = {}) => {
  const payload = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || "").trim();

    if (!name) {
      throw createValidationError([{ field: "name", message: "name is required." }]);
    }

    payload.name = name;
  }

  const stringFields = ["city", "state", "country", "website"];
  for (const field of stringFields) {
    if (body[field] !== undefined) {
      payload[field] = String(body[field] || "").trim();
    }
  }

  if (body.rating !== undefined) {
    const rating = toNumber(body.rating, "rating");
    if (rating > 5) {
      throw createValidationError([{ field: "rating", message: "rating must be between 0 and 5." }]);
    }

    payload.rating = rating;
  }

  if (body.ranking !== undefined) {
    const ranking = toNumber(body.ranking, "ranking");
    if (ranking < 1) {
      throw createValidationError([{ field: "ranking", message: "ranking must be at least 1." }]);
    }

    payload.ranking = ranking;
  }

  const facilities = parseFacilities(body.facilities);
  if (facilities !== undefined) {
    payload.facilities = facilities;
  }

  return payload;
};

const buildSchoolQuery = (req) =>
  parseListQuery(req.query, {
    defaultLimit: 20,
    defaultSortField: "createdAt",
    defaultSortOrder: -1,
    allowedSortFields: ["_id", "name", "country", "city", "ranking", "rating", "createdAt", "updatedAt"],
    allowedFilters: ["search", "country", "city"],
  });

const filterRuntimeSchools = (schools, queryOptions) => {
  const search = queryOptions.filters.search ? new RegExp(escapeRegExp(queryOptions.filters.search), "i") : null;

  const filtered = schools.filter((school) => {
    if (queryOptions.filters.country && String(school.country || "").toLowerCase() !== queryOptions.filters.country.toLowerCase()) {
      return false;
    }

    if (queryOptions.filters.city && String(school.city || "").toLowerCase() !== queryOptions.filters.city.toLowerCase()) {
      return false;
    }

    if (search) {
      const haystack = `${school.name || ""} ${school.city || ""} ${school.country || ""}`;
      return search.test(haystack);
    }

    return true;
  });

  return applyInMemoryListQuery(filtered, queryOptions);
};

export const listSchools = async (req, res, next) => {
  try {
    const queryOptions = buildSchoolQuery(req);

    if (isDatabaseConnected(req)) {
      const filter = {};

      if (queryOptions.filters.country) {
        filter.country = new RegExp(`^${escapeRegExp(queryOptions.filters.country)}$`, "i");
      }

      if (queryOptions.filters.city) {
        filter.city = new RegExp(`^${escapeRegExp(queryOptions.filters.city)}$`, "i");
      }

      if (queryOptions.filters.search) {
        const searchExpr = new RegExp(escapeRegExp(queryOptions.filters.search), "i");
        filter.$or = [{ name: searchExpr }, { city: searchExpr }, { country: searchExpr }];
      }

      const rows = await School.find(filter)
        .sort({ [queryOptions.sortField]: queryOptions.sortOrder })
        .skip(queryOptions.skip)
        .limit(queryOptions.limit)
        .lean();

      sendApiResponse(res, 200, rows, { source: "database" });
      return;
    }

    const runtimeSchools = getRuntimeCollection(req, "schools");
    const rows = filterRuntimeSchools(runtimeSchools, queryOptions);
    sendApiResponse(res, 200, rows, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const createSchool = async (req, res, next) => {
  try {
    const payload = parseSchoolPayload(req.body || {});

    if (isDatabaseConnected(req)) {
      const created = await School.create(payload);
      sendApiResponse(res, 201, created.toObject(), { source: "database" });
      return;
    }

    const runtimeSchools = getRuntimeCollection(req, "schools");
    const created = {
      _id: createRuntimeId(),
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    runtimeSchools.unshift(created);
    sendApiResponse(res, 201, created, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const getSchoolById = async (req, res, next) => {
  try {
    const schoolId = String(req.params.id);

    if (isDatabaseConnected(req)) {
      const row = await School.findById(schoolId).lean();
      if (!row) {
        throw new AppError(404, "NOT_FOUND", "School was not found.");
      }

      sendApiResponse(res, 200, row, { source: "database" });
      return;
    }

    const runtimeSchools = getRuntimeCollection(req, "schools");
    const row = runtimeSchools.find((item) => String(item._id) === schoolId);

    if (!row) {
      throw new AppError(404, "NOT_FOUND", "School was not found.");
    }

    sendApiResponse(res, 200, row, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const updateSchool = async (req, res, next) => {
  try {
    const schoolId = String(req.params.id);
    const payload = parseSchoolPayload(req.body || {}, { partial: true });

    if (isDatabaseConnected(req)) {
      const updated = await School.findByIdAndUpdate(schoolId, payload, { new: true, runValidators: true }).lean();

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "School was not found.");
      }

      sendApiResponse(res, 200, updated, { source: "database" });
      return;
    }

    const runtimeSchools = getRuntimeCollection(req, "schools");
    const index = runtimeSchools.findIndex((item) => String(item._id) === schoolId);

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "School was not found.");
    }

    const updated = {
      ...runtimeSchools[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    runtimeSchools[index] = updated;
    sendApiResponse(res, 200, updated, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const deleteSchool = async (req, res, next) => {
  try {
    const schoolId = String(req.params.id);

    if (isDatabaseConnected(req)) {
      const deleted = await School.findByIdAndDelete(schoolId).lean();

      if (!deleted) {
        throw new AppError(404, "NOT_FOUND", "School was not found.");
      }

      sendApiResponse(res, 200, { message: "School deleted." }, { source: "database" });
      return;
    }

    const runtimeSchools = getRuntimeCollection(req, "schools");
    const index = runtimeSchools.findIndex((item) => String(item._id) === schoolId);

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "School was not found.");
    }

    runtimeSchools.splice(index, 1);
    sendApiResponse(res, 200, { message: "School deleted." }, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};
