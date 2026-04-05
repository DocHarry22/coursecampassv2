import { AppError, createValidationError } from "./errors.js";

const CANONICAL_ROLES = new Set(["user", "admin", "superadmin"]);
const ACCOUNT_STATUSES = new Set(["active", "suspended", "disabled"]);

export const normalizeRole = (value) => {
  const normalized = String(value || "user").trim().toLowerCase();
  return CANONICAL_ROLES.has(normalized) ? normalized : "user";
};

export const parseRole = (value, fieldName = "role") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!CANONICAL_ROLES.has(normalized)) {
    throw createValidationError([
      {
        field: fieldName,
        message: "role must be one of: user, admin, superadmin.",
      },
    ]);
  }

  return normalized;
};

export const normalizeAccountStatus = (value) => {
  const normalized = String(value || "active").trim().toLowerCase();
  return ACCOUNT_STATUSES.has(normalized) ? normalized : "active";
};

export const parseAccountStatus = (value, fieldName = "accountStatus") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!ACCOUNT_STATUSES.has(normalized)) {
    throw createValidationError([
      {
        field: fieldName,
        message: "accountStatus must be one of: active, suspended, disabled.",
      },
    ]);
  }

  return normalized;
};

export const assertUserIsActive = (user, { message = "Account is not active." } = {}) => {
  const accountStatus = normalizeAccountStatus(user?.accountStatus);

  if (accountStatus !== "active") {
    throw new AppError(403, "AUTH_ACCOUNT_INACTIVE", message);
  }
};
