import Todo from "../models/Todo.js";
import { AppError, createValidationError } from "../utils/errors.js";
import { sendApiResponse } from "../utils/response.js";
import { isDatabaseConnected } from "../utils/fallbackData.js";
import { applyInMemoryListQuery, escapeRegExp, parseListQuery } from "../utils/queryOptions.js";
import { createRuntimeId, getRuntimeCollection } from "../utils/runtimeStore.js";

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

const parseCompleted = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  throw createValidationError([{ field: "completed", message: "completed must be true or false." }]);
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

const parseTodoPayload = (body, { partial = false } = {}) => {
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

  if (body.priority !== undefined) {
    const priority = String(body.priority || "").trim().toLowerCase();

    if (!["low", "medium", "high"].includes(priority)) {
      throw createValidationError([{ field: "priority", message: "priority must be one of: low, medium, high." }]);
    }

    payload.priority = priority;
  }

  if (body.completed !== undefined) {
    payload.completed = parseBoolean(body.completed, "completed");
  }

  if (body.dueDate !== undefined) {
    payload.dueDate = parseDate(body.dueDate, "dueDate");
  }

  return payload;
};

const buildTodoQuery = (req) => {
  const queryOptions = parseListQuery(req.query, {
    defaultLimit: 30,
    defaultSortField: "createdAt",
    defaultSortOrder: -1,
    allowedSortFields: ["_id", "title", "priority", "completed", "dueDate", "createdAt", "updatedAt"],
    allowedFilters: ["search", "priority", "completed"],
  });

  return {
    ...queryOptions,
    filters: {
      ...queryOptions.filters,
      completed: parseCompleted(queryOptions.filters.completed),
    },
  };
};

const filterRuntimeTodos = (todos, queryOptions) => {
  const search = queryOptions.filters.search ? new RegExp(escapeRegExp(queryOptions.filters.search), "i") : null;

  const filtered = todos.filter((todo) => {
    if (queryOptions.filters.priority && String(todo.priority || "").toLowerCase() !== queryOptions.filters.priority.toLowerCase()) {
      return false;
    }

    if (queryOptions.filters.completed !== null && Boolean(todo.completed) !== queryOptions.filters.completed) {
      return false;
    }

    if (search) {
      const haystack = `${todo.title || ""} ${todo.description || ""}`;
      return search.test(haystack);
    }

    return true;
  });

  return applyInMemoryListQuery(filtered, queryOptions);
};

const isTodoOwner = (todo, userId) => String(todo.userId) === String(userId);

export const listTodos = async (req, res, next) => {
  try {
    const queryOptions = buildTodoQuery(req);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const filter = {
        userId,
      };

      if (queryOptions.filters.priority) {
        filter.priority = new RegExp(`^${escapeRegExp(queryOptions.filters.priority)}$`, "i");
      }

      if (queryOptions.filters.completed !== null) {
        filter.completed = queryOptions.filters.completed;
      }

      if (queryOptions.filters.search) {
        const searchExpr = new RegExp(escapeRegExp(queryOptions.filters.search), "i");
        filter.$or = [{ title: searchExpr }, { description: searchExpr }];
      }

      const rows = await Todo.find(filter)
        .sort({ [queryOptions.sortField]: queryOptions.sortOrder })
        .skip(queryOptions.skip)
        .limit(queryOptions.limit)
        .lean();

      sendApiResponse(res, 200, rows, { source: "database" });
      return;
    }

    const runtimeTodos = getRuntimeCollection(req, "todos").filter((todo) => isTodoOwner(todo, userId));
    const rows = filterRuntimeTodos(runtimeTodos, queryOptions);
    sendApiResponse(res, 200, rows, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const createTodo = async (req, res, next) => {
  try {
    const userId = String(req.auth.userId);
    const payload = parseTodoPayload(req.body || {});

    if (isDatabaseConnected(req)) {
      const created = await Todo.create({ ...payload, userId });
      sendApiResponse(res, 201, created.toObject(), { source: "database" });
      return;
    }

    const runtimeTodos = getRuntimeCollection(req, "todos");
    const created = {
      _id: createRuntimeId(),
      userId,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    runtimeTodos.unshift(created);
    sendApiResponse(res, 201, created, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const getTodoById = async (req, res, next) => {
  try {
    const todoId = String(req.params.id);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const row = await Todo.findOne({ _id: todoId, userId }).lean();

      if (!row) {
        throw new AppError(404, "NOT_FOUND", "Todo item was not found.");
      }

      sendApiResponse(res, 200, row, { source: "database" });
      return;
    }

    const runtimeTodos = getRuntimeCollection(req, "todos");
    const row = runtimeTodos.find((todo) => String(todo._id) === todoId && isTodoOwner(todo, userId));

    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Todo item was not found.");
    }

    sendApiResponse(res, 200, row, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const updateTodo = async (req, res, next) => {
  try {
    const todoId = String(req.params.id);
    const userId = String(req.auth.userId);
    const payload = parseTodoPayload(req.body || {}, { partial: true });

    if (isDatabaseConnected(req)) {
      const updated = await Todo.findOneAndUpdate({ _id: todoId, userId }, payload, {
        new: true,
        runValidators: true,
      }).lean();

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Todo item was not found.");
      }

      sendApiResponse(res, 200, updated, { source: "database" });
      return;
    }

    const runtimeTodos = getRuntimeCollection(req, "todos");
    const index = runtimeTodos.findIndex((todo) => String(todo._id) === todoId && isTodoOwner(todo, userId));

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "Todo item was not found.");
    }

    const updated = {
      ...runtimeTodos[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    runtimeTodos[index] = updated;
    sendApiResponse(res, 200, updated, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const deleteTodo = async (req, res, next) => {
  try {
    const todoId = String(req.params.id);
    const userId = String(req.auth.userId);

    if (isDatabaseConnected(req)) {
      const deleted = await Todo.findOneAndDelete({ _id: todoId, userId }).lean();

      if (!deleted) {
        throw new AppError(404, "NOT_FOUND", "Todo item was not found.");
      }

      sendApiResponse(res, 200, { message: "Todo deleted." }, { source: "database" });
      return;
    }

    const runtimeTodos = getRuntimeCollection(req, "todos");
    const index = runtimeTodos.findIndex((todo) => String(todo._id) === todoId && isTodoOwner(todo, userId));

    if (index < 0) {
      throw new AppError(404, "NOT_FOUND", "Todo item was not found.");
    }

    runtimeTodos.splice(index, 1);
    sendApiResponse(res, 200, { message: "Todo deleted." }, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};
