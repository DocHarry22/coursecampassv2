import User from "../models/User.js";
import { AppError } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/authTokens.js";
import { isDatabaseConnected } from "../utils/fallbackData.js";
import { findRuntimeUserById } from "../utils/runtimeStore.js";
import { normalizeRole, sanitizeUser } from "../utils/authUser.js";
import { assertUserIsActive } from "../utils/userGovernance.js";

const unauthorized = (message = "You must be authenticated to access this resource.") =>
  new AppError(401, "AUTH_UNAUTHORIZED", message);

const forbidden = (message = "You do not have permission to access this resource.") =>
  new AppError(403, "AUTH_FORBIDDEN", message);

const extractBearerToken = (req) => {
  const authorization = req.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim() || null;
};

const findUserById = async (req, userId) => {
  const normalizedId = String(userId);

  if (isDatabaseConnected(req)) {
    const dbUser = await User.findById(normalizedId).lean();
    if (dbUser) {
      return { user: dbUser, source: "database" };
    }
  }

  const runtimeUser = findRuntimeUserById(req, normalizedId);
  if (runtimeUser) {
    return { user: runtimeUser, source: "fallback" };
  }

  return null;
};

const attachAuthContext = (req, resolvedUser, decodedToken) => {
  const safeUser = sanitizeUser(resolvedUser.user);
  req.user = safeUser;
  req.auth = {
    userId: String(safeUser._id),
    role: normalizeRole(safeUser.role || decodedToken.role),
    source: resolvedUser.source,
    token: decodedToken,
  };
};

export const authenticateAccessToken = async (req, _res, next) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      throw unauthorized();
    }

    const decodedToken = verifyAccessToken(accessToken);
    const resolvedUser = await findUserById(req, decodedToken.sub);

    if (!resolvedUser) {
      throw unauthorized("The token belongs to a user that no longer exists.");
    }

    assertUserIsActive(resolvedUser.user, {
      message: "This account is not active. Access has been blocked.",
    });

    attachAuthContext(req, resolvedUser, decodedToken);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRoles = (...roles) => {
  const roleSet = new Set(roles.map((role) => normalizeRole(role)));

  return (req, _res, next) => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }

    if (!roleSet.has(normalizeRole(req.auth.role))) {
      next(forbidden());
      return;
    }

    next();
  };
};
