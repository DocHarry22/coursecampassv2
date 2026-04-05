import CalendarEvent from "../models/CalendarEvent.js";
import { AppError, createValidationError } from "../utils/errors.js";
import { sendApiResponse } from "../utils/response.js";
import { isDatabaseConnected } from "../utils/fallbackData.js";
import { applyInMemoryListQuery, escapeRegExp, parseListQuery } from "../utils/queryOptions.js";
import { createRuntimeId, getRuntimeCollection } from "../utils/runtimeStore.js";

const parseDate = (value, fieldName, { required = false } = {}) => {
  if (value === undefined) {
    if (required) {
      throw createValidationError([{ field: fieldName, message: `${fieldName} is required.` }]);
    }

    return undefined;
  }

  if (value === null || value === "") {
    if (required) {
      throw createValidationError([{ field: fieldName, message: `${fieldName} is required.` }]);
    }

    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError([{ field: fieldName, message: `${fieldName} must be a valid date.` }]);
  }

  return parsed;
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

const parseCalendarPayload = (body, { partial = false } = {}) => {
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

  const startAt = parseDate(body.startAt, "startAt", { required: !partial });
  if (startAt !== undefined) {
    payload.startAt = startAt;
  }

  const endAt = parseDate(body.endAt, "endAt", { required: !partial });
  if (endAt !== undefined) {
    payload.endAt = endAt;
  }

  if (payload.startAt && payload.endAt && payload.endAt < payload.startAt) {
    throw createValidationError([{ field: "endAt", message: "endAt must be greater than or equal to startAt." }]);
  }

  if (body.allDay !== undefined) {
    payload.allDay = parseBoolean(body.allDay, "allDay");
  }

  if (body.category !== undefined) {
    payload.category = String(body.category || "").trim().toLowerCase() || "general";
  }

  return payload;
};

const parseOptionalDateFilter = (value, fieldName) => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError([{ field: fieldName, message: `${fieldName} must be a valid date.` }]);
  }

  return parsed;
};

const buildCalendarQuery = (req) => {
  const queryOptions = parseListQuery(req.query, {
    defaultLimit: 40,
    defaultSortField: "startAt",
    defaultSortOrder: 1,
    allowedSortFields: ["_id", "title", "category", "startAt", "endAt", "createdAt", "updatedAt"],
    allowedFilters: ["search", "category", "startFrom", "endTo"],
  });

  return {
    ...queryOptions,
    filters: {
      ...queryOptions.filters,
      startFrom: parseOptionalDateFilter(queryOptions.filters.startFrom, "startFrom"),
      endTo: parseOptionalDateFilter(queryOptions.filters.endTo, "endTo"),
    },
  };
};

const isEventOwner = (event, userId) => String(event.userId) === String(userId);

const filterRuntimeEvents = (events, queryOptions) => {
  const search = queryOptions.filters.search ? new RegExp(escapeRegExp(queryOptions.filters.search), "i") : null;

  const filtered = events.filter((event) => {
    if (queryOptions.filters.category && String(event.category || "").toLowerCase() !== queryOptions.filters.category.toLowerCase()) {
      return false;
    }

    const eventStart = event.startAt ? new Date(event.startAt) : null;

    if (queryOptions.filters.startFrom && eventStart && eventStart < queryOptions.filters.startFrom) {
      return false;
    }

    if (queryOptions.filters.endTo && eventStart && eventStart > queryOptions.filters.endTo) {
      return false;
    }

    if (search) {
      const haystack = `${event.title || ""} ${event.description || ""} ${event.category || ""}`;
      return search.test(haystack);
    }

    return true;
  });

  return applyInMemoryListQuery(filtered, queryOptions);
};

export const listCalendarEvents = async (req, res, next) => {
  try {
    const queryOptions = buildCalendarQuery(req);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const filter = { userId };

      if (queryOptions.filters.category) {
        filter.category = new RegExp(`^${escapeRegExp(queryOptions.filters.category)}$`, "i");
      }

      if (queryOptions.filters.startFrom || queryOptions.filters.endTo) {
        filter.startAt = {};

        if (queryOptions.filters.startFrom) {
          filter.startAt.$gte = queryOptions.filters.startFrom;
        }

        if (queryOptions.filters.endTo) {
          filter.startAt.$lte = queryOptions.filters.endTo;
        }
      }

      if (queryOptions.filters.search) {
        const searchExpr = new RegExp(escapeRegExp(queryOptions.filters.search), "i");
        filter.$or = [{ title: searchExpr }, { description: searchExpr }, { category: searchExpr }];
      }

      const rows = await CalendarEvent.find(filter)
        .sort({ [queryOptions.sortField]: queryOptions.sortOrder })
        .skip(queryOptions.skip)
        .limit(queryOptions.limit)
        .lean();

      sendApiResponse(res, 200, rows, { source: "database" });
      return;
    }

    const runtimeEvents = getRuntimeCollection(req, "calendarEvents").filter((event) => isEventOwner(event, userId));
    const rows = filterRuntimeEvents(runtimeEvents, queryOptions);
    sendApiResponse(res, 200, rows, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const createCalendarEvent = async (req, res, next) => {
  try {
    const userId = String(req.auth.userId);
    const payload = parseCalendarPayload(req.body || {});

    if (isDatabaseConnected(req)) {
      const created = await CalendarEvent.create({ ...payload, userId });
      sendApiResponse(res, 201, created.toObject(), { source: "database" });
      return;
    }

    const runtimeEvents = getRuntimeCollection(req, "calendarEvents");
    const created = {
      _id: createRuntimeId(),
      userId,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    runtimeEvents.unshift(created);
    sendApiResponse(res, 201, created, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const getCalendarEventById = async (req, res, next) => {
  try {
    const eventId = String(req.params.id);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const row = await CalendarEvent.findOne({ _id: eventId, userId }).lean();

      if (!row) {
        throw new AppError(404, "NOT_FOUND", "Calendar event was not found.");
      }

      sendApiResponse(res, 200, row, { source: "database" });
      return;
    }

    const runtimeEvents = getRuntimeCollection(req, "calendarEvents");
    const row = runtimeEvents.find((event) => String(event._id) === eventId && isEventOwner(event, userId));

    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Calendar event was not found.");
    }

    sendApiResponse(res, 200, row, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const updateCalendarEvent = async (req, res, next) => {
  try {
    const eventId = String(req.params.id);
    const userId = String(req.auth.userId);
    const payload = parseCalendarPayload(req.body || {}, { partial: true });

    if (isDatabaseConnected(req)) {
      const updated = await CalendarEvent.findOneAndUpdate({ _id: eventId, userId }, payload, {
        new: true,
        runValidators: true,
      }).lean();

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Calendar event was not found.");
      }

      sendApiResponse(res, 200, updated, { source: "database" });
      return;
    }

    const runtimeEvents = getRuntimeCollection(req, "calendarEvents");
    const index = runtimeEvents.findIndex((event) => String(event._id) === eventId && isEventOwner(event, userId));

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "Calendar event was not found.");
    }

    const updated = {
      ...runtimeEvents[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    runtimeEvents[index] = updated;
    sendApiResponse(res, 200, updated, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const deleteCalendarEvent = async (req, res, next) => {
  try {
    const eventId = String(req.params.id);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const deleted = await CalendarEvent.findOneAndDelete({ _id: eventId, userId }).lean();

      if (!deleted) {
        throw new AppError(404, "NOT_FOUND", "Calendar event was not found.");
      }

      sendApiResponse(res, 200, { message: "Calendar event deleted." }, { source: "database" });
      return;
    }

    const runtimeEvents = getRuntimeCollection(req, "calendarEvents");
    const index = runtimeEvents.findIndex((event) => String(event._id) === eventId && isEventOwner(event, userId));

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "Calendar event was not found.");
    }

    runtimeEvents.splice(index, 1);
    sendApiResponse(res, 200, { message: "Calendar event deleted." }, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};
