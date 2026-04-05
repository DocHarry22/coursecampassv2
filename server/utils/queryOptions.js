import { createValidationError } from "./errors.js";

const DEFAULT_MAX_LIMIT = 100;

const compareValues = (left, right) => {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined) {
    return -1;
  }

  if (right === null || right === undefined) {
    return 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
};

const parseNumber = (value, field, { min = null, max = null, isFloat = false } = {}) => {
  if (value === undefined) {
    return null;
  }

  const parsed = isFloat ? Number.parseFloat(value) : Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw createValidationError([{ field, message: `${field} must be a valid number.` }]);
  }

  if (min !== null && parsed < min) {
    throw createValidationError([{ field, message: `${field} must be greater than or equal to ${min}.` }]);
  }

  if (max !== null && parsed > max) {
    throw createValidationError([{ field, message: `${field} must be less than or equal to ${max}.` }]);
  }

  return parsed;
};

const parseOrder = (value, defaultSortOrder) => {
  if (value === undefined) {
    return defaultSortOrder;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "asc" || normalized === "1") {
    return 1;
  }

  if (normalized === "desc" || normalized === "-1") {
    return -1;
  }

  throw createValidationError([{ field: "order", message: "order must be one of: asc, desc, 1, -1." }]);
};

const parseStringFilter = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

export const parseListQuery = (
  query,
  {
    defaultLimit = 20,
    maxLimit = DEFAULT_MAX_LIMIT,
    defaultSortField = "_id",
    defaultSortOrder = -1,
    allowedSortFields = ["_id"],
    allowedFilters = [],
    numberFilters = [],
  } = {}
) => {
  const allowedKeys = new Set(["limit", "page", "offset", "sort", "order", ...allowedFilters, ...numberFilters]);
  const unknownKeys = Object.keys(query).filter((key) => !allowedKeys.has(key));

  if (unknownKeys.length) {
    throw createValidationError(
      unknownKeys.map((key) => ({
        field: key,
        message: `Unsupported query parameter '${key}'.`,
      }))
    );
  }

  const limit = parseNumber(query.limit, "limit", { min: 1, max: maxLimit }) ?? defaultLimit;
  const page = parseNumber(query.page, "page", { min: 1 }) ?? 1;
  const offset = parseNumber(query.offset, "offset", { min: 0 });
  const skip = offset ?? (page - 1) * limit;
  const sortField = query.sort === undefined ? defaultSortField : String(query.sort);

  if (!allowedSortFields.includes(sortField)) {
    throw createValidationError([
      {
        field: "sort",
        message: `sort must be one of: ${allowedSortFields.join(", ")}.`,
      },
    ]);
  }

  const sortOrder = parseOrder(query.order, defaultSortOrder);

  const filters = {};
  for (const key of allowedFilters) {
    filters[key] = parseStringFilter(query[key]);
  }

  for (const key of numberFilters) {
    filters[key] = parseNumber(query[key], key, { min: 0, isFloat: true });
  }

  return {
    limit,
    page,
    offset,
    skip,
    sortField,
    sortOrder,
    filters,
  };
};

export const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const applyInMemoryListQuery = (rows, queryOptions) => {
  const sortedRows = [...rows].sort((left, right) => {
    const comparison = compareValues(left?.[queryOptions.sortField], right?.[queryOptions.sortField]);
    return comparison * queryOptions.sortOrder;
  });

  return sortedRows.slice(queryOptions.skip, queryOptions.skip + queryOptions.limit);
};
