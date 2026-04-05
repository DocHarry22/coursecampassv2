import { normalizeAccountStatus, normalizeRole } from "./userGovernance.js";

export { normalizeRole };

const sanitize = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
};

export const sanitizeUser = (user) => {
  const safeUser = sanitize(user) || {};
  delete safeUser.password;
  delete safeUser.passwordHash;
  delete safeUser.refreshTokenHash;

  return {
    ...safeUser,
    _id: safeUser._id ? String(safeUser._id) : safeUser._id,
    role: normalizeRole(safeUser.role),
    accountStatus: normalizeAccountStatus(safeUser.accountStatus),
  };
};
