import mongoose from "mongoose";
import Course from "../models/Course.js";
import { AppError, createValidationError } from "../utils/errors.js";
import { sendApiResponse } from "../utils/response.js";
import { isDatabaseConnected } from "../utils/fallbackData.js";
import { createRuntimeId, getRuntimeCollection } from "../utils/runtimeStore.js";
import { applyInMemoryListQuery, escapeRegExp, parseListQuery } from "../utils/queryOptions.js";

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

const parseActiveFilter = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).toLowerCase();

  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  throw createValidationError([{ field: "isActive", message: "isActive must be true or false." }]);
};

const parseBoolean = (value, fieldName) => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  throw createValidationError([{ field: fieldName, message: `${fieldName} must be true or false.` }]);
};

const parseCoursePayload = (body, { partial = false } = {}) => {
  const payload = {};

  if (!partial || body.title !== undefined) {
    const title = String(body.title || "").trim();
    if (!title) {
      throw createValidationError([{ field: "title", message: "title is required." }]);
    }
    payload.title = title;
  }

  if (body.description !== undefined) {
    payload.description = String(body.description || "").trim();
  }

  if (body.category !== undefined) {
    payload.category = String(body.category || "").trim() || "General";
  }

  if (body.level !== undefined) {
    payload.level = String(body.level || "").trim() || "Beginner";
  }

  if (body.mode !== undefined) {
    const mode = String(body.mode || "").trim().toLowerCase();
    if (!mode || !["online", "onsite", "hybrid"].includes(mode)) {
      throw createValidationError([{ field: "mode", message: "mode must be one of: online, onsite, hybrid." }]);
    }
    payload.mode = mode;
  }

  if (body.durationWeeks !== undefined) {
    payload.durationWeeks = toNumber(body.durationWeeks, "durationWeeks");
  }

  if (body.tuitionFee !== undefined) {
    payload.tuitionFee = toNumber(body.tuitionFee, "tuitionFee");
  }

  if (body.schoolId !== undefined) {
    if (!body.schoolId) {
      payload.schoolId = null;
    } else {
      const schoolId = String(body.schoolId);
      if (!mongoose.Types.ObjectId.isValid(schoolId)) {
        throw createValidationError([{ field: "schoolId", message: "schoolId must be a valid ObjectId." }]);
      }
      payload.schoolId = schoolId;
    }
  }

  if (body.isActive !== undefined) {
    payload.isActive = parseBoolean(body.isActive, "isActive");
  }

  return payload;
};

const buildCourseQuery = (req) => {
  const listQuery = parseListQuery(req.query, {
    defaultLimit: 20,
    defaultSortField: "createdAt",
    defaultSortOrder: -1,
    allowedSortFields: ["_id", "title", "category", "level", "tuitionFee", "durationWeeks", "createdAt", "updatedAt"],
    allowedFilters: ["search", "category", "level", "mode", "schoolId", "isActive"],
  });

  return {
    ...listQuery,
    filters: {
      ...listQuery.filters,
      isActive: parseActiveFilter(listQuery.filters.isActive),
    },
  };
};

const filterRuntimeCourses = (courses, queryOptions) => {
  const search = queryOptions.filters.search ? new RegExp(escapeRegExp(queryOptions.filters.search), "i") : null;

  const filtered = courses.filter((course) => {
    if (queryOptions.filters.category && String(course.category || "").toLowerCase() !== queryOptions.filters.category.toLowerCase()) {
      return false;
    }

    if (queryOptions.filters.level && String(course.level || "").toLowerCase() !== queryOptions.filters.level.toLowerCase()) {
      return false;
    }

    if (queryOptions.filters.mode && String(course.mode || "").toLowerCase() !== queryOptions.filters.mode.toLowerCase()) {
      return false;
    }

    if (queryOptions.filters.schoolId && String(course.schoolId || "") !== String(queryOptions.filters.schoolId)) {
      return false;
    }

    if (queryOptions.filters.isActive !== null && Boolean(course.isActive) !== queryOptions.filters.isActive) {
      return false;
    }

    if (search) {
      const haystack = `${course.title || ""} ${course.description || ""} ${course.category || ""}`;
      return search.test(haystack);
    }

    return true;
  });

  return applyInMemoryListQuery(filtered, queryOptions);
};

export const listCourses = async (req, res, next) => {
  try {
    const queryOptions = buildCourseQuery(req);

    if (isDatabaseConnected(req)) {
      const filter = {};

      if (queryOptions.filters.category) {
        filter.category = new RegExp(`^${escapeRegExp(queryOptions.filters.category)}$`, "i");
      }

      if (queryOptions.filters.level) {
        filter.level = new RegExp(`^${escapeRegExp(queryOptions.filters.level)}$`, "i");
      }

      if (queryOptions.filters.mode) {
        filter.mode = new RegExp(`^${escapeRegExp(queryOptions.filters.mode)}$`, "i");
      }

      if (queryOptions.filters.schoolId) {
        if (!mongoose.Types.ObjectId.isValid(queryOptions.filters.schoolId)) {
          throw createValidationError([{ field: "schoolId", message: "schoolId must be a valid ObjectId." }]);
        }

        filter.schoolId = queryOptions.filters.schoolId;
      }

      if (queryOptions.filters.isActive !== null) {
        filter.isActive = queryOptions.filters.isActive;
      }

      if (queryOptions.filters.search) {
        const searchExpr = new RegExp(escapeRegExp(queryOptions.filters.search), "i");
        filter.$or = [{ title: searchExpr }, { description: searchExpr }, { category: searchExpr }];
      }

      const courses = await Course.find(filter)
        .sort({ [queryOptions.sortField]: queryOptions.sortOrder })
        .skip(queryOptions.skip)
        .limit(queryOptions.limit)
        .lean();

      sendApiResponse(res, 200, courses, { source: "database" });
      return;
    }

    const runtimeCourses = getRuntimeCollection(req, "courses");
    const rows = filterRuntimeCourses(runtimeCourses, queryOptions);
    sendApiResponse(res, 200, rows, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req, res, next) => {
  try {
    const payload = parseCoursePayload(req.body || {});

    if (isDatabaseConnected(req)) {
      const created = await Course.create(payload);
      sendApiResponse(res, 201, created.toObject(), { source: "database" });
      return;
    }

    const runtimeCourses = getRuntimeCollection(req, "courses");
    const created = {
      _id: createRuntimeId(),
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    runtimeCourses.unshift(created);
    sendApiResponse(res, 201, created, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const getCourseById = async (req, res, next) => {
  try {
    const courseId = String(req.params.id);

    if (isDatabaseConnected(req)) {
      const course = await Course.findById(courseId).lean();

      if (!course) {
        throw new AppError(404, "NOT_FOUND", "Course was not found.");
      }

      sendApiResponse(res, 200, course, { source: "database" });
      return;
    }

    const runtimeCourses = getRuntimeCollection(req, "courses");
    const course = runtimeCourses.find((row) => String(row._id) === courseId);

    if (!course) {
      throw new AppError(404, "NOT_FOUND", "Course was not found.");
    }

    sendApiResponse(res, 200, course, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    const courseId = String(req.params.id);
    const payload = parseCoursePayload(req.body || {}, { partial: true });

    if (isDatabaseConnected(req)) {
      const updated = await Course.findByIdAndUpdate(courseId, payload, { new: true, runValidators: true }).lean();

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Course was not found.");
      }

      sendApiResponse(res, 200, updated, { source: "database" });
      return;
    }

    const runtimeCourses = getRuntimeCollection(req, "courses");
    const index = runtimeCourses.findIndex((row) => String(row._id) === courseId);

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "Course was not found.");
    }

    const updated = {
      ...runtimeCourses[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    runtimeCourses[index] = updated;
    sendApiResponse(res, 200, updated, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (req, res, next) => {
  try {
    const courseId = String(req.params.id);

    if (isDatabaseConnected(req)) {
      const deleted = await Course.findByIdAndDelete(courseId).lean();

      if (!deleted) {
        throw new AppError(404, "NOT_FOUND", "Course was not found.");
      }

      sendApiResponse(res, 200, { message: "Course deleted." }, { source: "database" });
      return;
    }

    const runtimeCourses = getRuntimeCollection(req, "courses");
    const index = runtimeCourses.findIndex((row) => String(row._id) === courseId);

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "Course was not found.");
    }

    runtimeCourses.splice(index, 1);
    sendApiResponse(res, 200, { message: "Course deleted." }, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};
