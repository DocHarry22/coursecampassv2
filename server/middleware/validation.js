import mongoose from "mongoose";
import { createValidationError } from "../utils/errors.js";

const DEFAULT_LIMITS = {
  customers: 20,
  products: 20,
  transactions: 12,
};

const MAX_LIMIT = 100;

const parseNumber = (value, fieldName, { min = null, max = null, isFloat = false } = {}) => {
  if (value === undefined) {
    return null;
  }

  const parsed = isFloat ? Number.parseFloat(value) : Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw createValidationError([{ field: fieldName, message: `${fieldName} must be a valid number.` }]);
  }

  if (min !== null && parsed < min) {
    throw createValidationError([{ field: fieldName, message: `${fieldName} must be >= ${min}.` }]);
  }

  if (max !== null && parsed > max) {
    throw createValidationError([{ field: fieldName, message: `${fieldName} must be <= ${max}.` }]);
  }

  return parsed;
};

const parseSortOrder = (value) => {
  if (value === undefined) {
    return 1;
  }

  const normalized = String(value).toLowerCase();

  if (normalized === "asc" || normalized === "1") {
    return 1;
  }

  if (normalized === "desc" || normalized === "-1") {
    return -1;
  }

  throw createValidationError([{ field: "order", message: "order must be one of: asc, desc, 1, -1." }]);
};

const parseSortField = (value, allowedFields, defaultField) => {
  if (value === undefined) {
    return defaultField;
  }

  if (!allowedFields.includes(value)) {
    throw createValidationError([
      {
        field: "sort",
        message: `sort must be one of: ${allowedFields.join(", ")}.`,
      },
    ]);
  }

  return value;
};

const assertAllowedKeys = (query, allowedKeys) => {
  const unknownKeys = Object.keys(query).filter((key) => !allowedKeys.has(key));

  if (unknownKeys.length) {
    throw createValidationError(
      unknownKeys.map((key) => ({
        field: key,
        message: `Unsupported query parameter '${key}'.`,
      }))
    );
  }
};

const parsePagination = (query, defaultLimit) => {
  const limit = parseNumber(query.limit, "limit", { min: 1, max: MAX_LIMIT }) ?? defaultLimit;
  const page = parseNumber(query.page, "page", { min: 1 }) ?? 1;
  const offset = parseNumber(query.offset, "offset", { min: 0 });
  const skip = offset ?? (page - 1) * limit;

  return { limit, page, offset, skip };
};

const cleanString = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

export const validateCustomersQuery = (req, _res, next) => {
  try {
    const allowedKeys = new Set([
      "limit",
      "page",
      "offset",
      "sort",
      "order",
      "country",
      "occupation",
      "role",
      "search",
    ]);

    assertAllowedKeys(req.query, allowedKeys);

    const pagination = parsePagination(req.query, DEFAULT_LIMITS.customers);
    const sortField = parseSortField(req.query.sort, ["_id", "name", "email", "country", "occupation", "role"], "name");
    const sortOrder = parseSortOrder(req.query.order);

    req.queryOptions = {
      ...pagination,
      sortField,
      sortOrder,
      filters: {
        country: cleanString(req.query.country),
        occupation: cleanString(req.query.occupation),
        role: cleanString(req.query.role),
        search: cleanString(req.query.search),
      },
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const validateProductsQuery = (req, _res, next) => {
  try {
    const allowedKeys = new Set([
      "limit",
      "page",
      "offset",
      "sort",
      "order",
      "category",
      "minPrice",
      "maxPrice",
      "search",
    ]);

    assertAllowedKeys(req.query, allowedKeys);

    const pagination = parsePagination(req.query, DEFAULT_LIMITS.products);
    const sortField = parseSortField(req.query.sort, ["_id", "name", "price", "rating", "supply", "category"], "name");
    const sortOrder = parseSortOrder(req.query.order);
    const minPrice = parseNumber(req.query.minPrice, "minPrice", { min: 0, isFloat: true });
    const maxPrice = parseNumber(req.query.maxPrice, "maxPrice", { min: 0, isFloat: true });

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      throw createValidationError([
        { field: "minPrice", message: "minPrice must be less than or equal to maxPrice." },
        { field: "maxPrice", message: "maxPrice must be greater than or equal to minPrice." },
      ]);
    }

    req.queryOptions = {
      ...pagination,
      sortField,
      sortOrder,
      filters: {
        category: cleanString(req.query.category),
        search: cleanString(req.query.search),
        minPrice,
        maxPrice,
      },
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const validateTransactionsQuery = (req, _res, next) => {
  try {
    const allowedKeys = new Set([
      "limit",
      "page",
      "offset",
      "sort",
      "order",
      "userId",
      "minCost",
      "maxCost",
    ]);

    assertAllowedKeys(req.query, allowedKeys);

    const pagination = parsePagination(req.query, DEFAULT_LIMITS.transactions);
    const sortField = parseSortField(req.query.sort, ["_id", "cost"], "_id");
    const sortOrder = parseSortOrder(req.query.order);
    const userId = cleanString(req.query.userId);
    const minCost = parseNumber(req.query.minCost, "minCost", { min: 0, isFloat: true });
    const maxCost = parseNumber(req.query.maxCost, "maxCost", { min: 0, isFloat: true });

    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      throw createValidationError([{ field: "userId", message: "userId must be a valid ObjectId." }]);
    }

    if (minCost !== null && maxCost !== null && minCost > maxCost) {
      throw createValidationError([
        { field: "minCost", message: "minCost must be less than or equal to maxCost." },
        { field: "maxCost", message: "maxCost must be greater than or equal to minCost." },
      ]);
    }

    req.queryOptions = {
      ...pagination,
      sortField,
      sortOrder,
      filters: {
        userId,
        minCost,
        maxCost,
      },
    };

    next();
  } catch (error) {
    next(error);
  }
};
