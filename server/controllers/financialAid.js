import FinancialAid from "../models/FinancialAid.js";
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

const parseDate = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError([{ field: fieldName, message: `${fieldName} must be a valid date.` }]);
  }

  return parsed;
};

const parseEligibility = (value) => {
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

const parseFinancialAidPayload = (body, { partial = false } = {}) => {
  const payload = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) {
      throw createValidationError([{ field: "name", message: "name is required." }]);
    }

    payload.name = name;
  }

  if (!partial || body.provider !== undefined) {
    const provider = String(body.provider || "").trim();
    if (!provider) {
      throw createValidationError([{ field: "provider", message: "provider is required." }]);
    }

    payload.provider = provider;
  }

  if (body.amountMin !== undefined) {
    payload.amountMin = toNumber(body.amountMin, "amountMin");
  }

  if (body.amountMax !== undefined) {
    payload.amountMax = toNumber(body.amountMax, "amountMax");
  }

  if (
    payload.amountMin !== undefined &&
    payload.amountMax !== undefined &&
    payload.amountMin > payload.amountMax
  ) {
    throw createValidationError([{ field: "amountMax", message: "amountMax must be greater than or equal to amountMin." }]);
  }

  if (body.status !== undefined) {
    const status = String(body.status || "").trim().toLowerCase();
    if (!["open", "review", "ready", "submitted", "closed"].includes(status)) {
      throw createValidationError([{ field: "status", message: "status must be one of: open, review, ready, submitted, closed." }]);
    }

    payload.status = status;
  }

  if (body.deadline !== undefined) {
    payload.deadline = parseDate(body.deadline, "deadline");
  }

  if (body.notes !== undefined) {
    payload.notes = String(body.notes || "").trim();
  }

  if (body.applicationLink !== undefined) {
    payload.applicationLink = String(body.applicationLink || "").trim();
  }

  const eligibility = parseEligibility(body.eligibility);
  if (eligibility !== undefined) {
    payload.eligibility = eligibility;
  }

  return payload;
};

const buildFinancialAidQuery = (req) => {
  const queryOptions = parseListQuery(req.query, {
    defaultLimit: 20,
    defaultSortField: "createdAt",
    defaultSortOrder: -1,
    allowedSortFields: ["_id", "name", "provider", "status", "amountMin", "amountMax", "deadline", "createdAt", "updatedAt"],
    allowedFilters: ["search", "provider", "status"],
    numberFilters: ["minAmount", "maxAmount"],
  });

  if (
    queryOptions.filters.minAmount !== null &&
    queryOptions.filters.maxAmount !== null &&
    queryOptions.filters.minAmount > queryOptions.filters.maxAmount
  ) {
    throw createValidationError([{ field: "maxAmount", message: "maxAmount must be greater than or equal to minAmount." }]);
  }

  return queryOptions;
};

const filterRuntimeFinancialAid = (rows, queryOptions) => {
  const search = queryOptions.filters.search ? new RegExp(escapeRegExp(queryOptions.filters.search), "i") : null;

  const filtered = rows.filter((row) => {
    if (queryOptions.filters.provider && String(row.provider || "").toLowerCase() !== queryOptions.filters.provider.toLowerCase()) {
      return false;
    }

    if (queryOptions.filters.status && String(row.status || "").toLowerCase() !== queryOptions.filters.status.toLowerCase()) {
      return false;
    }

    if (queryOptions.filters.minAmount !== null && Number(row.amountMax || 0) < queryOptions.filters.minAmount) {
      return false;
    }

    if (queryOptions.filters.maxAmount !== null && Number(row.amountMin || 0) > queryOptions.filters.maxAmount) {
      return false;
    }

    if (search) {
      const haystack = `${row.name || ""} ${row.provider || ""} ${row.notes || ""}`;
      return search.test(haystack);
    }

    return true;
  });

  return applyInMemoryListQuery(filtered, queryOptions);
};

export const listFinancialAid = async (req, res, next) => {
  try {
    const queryOptions = buildFinancialAidQuery(req);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const filter = { userId };

      if (queryOptions.filters.provider) {
        filter.provider = new RegExp(`^${escapeRegExp(queryOptions.filters.provider)}$`, "i");
      }

      if (queryOptions.filters.status) {
        filter.status = new RegExp(`^${escapeRegExp(queryOptions.filters.status)}$`, "i");
      }

      if (queryOptions.filters.minAmount !== null) {
        filter.amountMax = { $gte: queryOptions.filters.minAmount };
      }

      if (queryOptions.filters.maxAmount !== null) {
        filter.amountMin = { $lte: queryOptions.filters.maxAmount };
      }

      if (queryOptions.filters.search) {
        const searchExpr = new RegExp(escapeRegExp(queryOptions.filters.search), "i");
        filter.$or = [{ name: searchExpr }, { provider: searchExpr }, { notes: searchExpr }];
      }

      const rows = await FinancialAid.find(filter)
        .sort({ [queryOptions.sortField]: queryOptions.sortOrder })
        .skip(queryOptions.skip)
        .limit(queryOptions.limit)
        .lean();

      sendApiResponse(res, 200, rows, { source: "database" });
      return;
    }

    const runtimeRows = getRuntimeCollection(req, "financialAids").filter((item) => String(item.userId) === userId);
    const rows = filterRuntimeFinancialAid(runtimeRows, queryOptions);
    sendApiResponse(res, 200, rows, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const createFinancialAid = async (req, res, next) => {
  try {
    const userId = String(req.auth.userId);
    const payload = parseFinancialAidPayload(req.body || {});

    if (isDatabaseConnected(req)) {
      const created = await FinancialAid.create({ ...payload, userId });
      sendApiResponse(res, 201, created.toObject(), { source: "database" });
      return;
    }

    const runtimeRows = getRuntimeCollection(req, "financialAids");
    const created = {
      _id: createRuntimeId(),
      userId,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    runtimeRows.unshift(created);
    sendApiResponse(res, 201, created, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const getFinancialAidById = async (req, res, next) => {
  try {
    const recordId = String(req.params.id);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const row = await FinancialAid.findOne({ _id: recordId, userId }).lean();

      if (!row) {
        throw new AppError(404, "NOT_FOUND", "Financial aid record was not found.");
      }

      sendApiResponse(res, 200, row, { source: "database" });
      return;
    }

    const runtimeRows = getRuntimeCollection(req, "financialAids");
    const row = runtimeRows.find((item) => String(item._id) === recordId && String(item.userId) === userId);

    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Financial aid record was not found.");
    }

    sendApiResponse(res, 200, row, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const updateFinancialAid = async (req, res, next) => {
  try {
    const recordId = String(req.params.id);
    const userId = String(req.auth.userId);
    const payload = parseFinancialAidPayload(req.body || {}, { partial: true });

    if (isDatabaseConnected(req)) {
      const updated = await FinancialAid.findOneAndUpdate({ _id: recordId, userId }, payload, { new: true, runValidators: true }).lean();

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Financial aid record was not found.");
      }

      sendApiResponse(res, 200, updated, { source: "database" });
      return;
    }

    const runtimeRows = getRuntimeCollection(req, "financialAids");
    const index = runtimeRows.findIndex((item) => String(item._id) === recordId && String(item.userId) === userId);

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "Financial aid record was not found.");
    }

    const updated = {
      ...runtimeRows[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    runtimeRows[index] = updated;
    sendApiResponse(res, 200, updated, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const deleteFinancialAid = async (req, res, next) => {
  try {
    const recordId = String(req.params.id);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const deleted = await FinancialAid.findOneAndDelete({ _id: recordId, userId }).lean();

      if (!deleted) {
        throw new AppError(404, "NOT_FOUND", "Financial aid record was not found.");
      }

      sendApiResponse(res, 200, { message: "Financial aid record deleted." }, { source: "database" });
      return;
    }

    const runtimeRows = getRuntimeCollection(req, "financialAids");
    const index = runtimeRows.findIndex((item) => String(item._id) === recordId && String(item.userId) === userId);

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "Financial aid record was not found.");
    }

    runtimeRows.splice(index, 1);
    sendApiResponse(res, 200, { message: "Financial aid record deleted." }, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};
