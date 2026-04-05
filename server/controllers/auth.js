import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { AppError, createValidationError } from "../utils/errors.js";
import {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/authTokens.js";
import { isDatabaseConnected } from "../utils/fallbackData.js";
import {
  clearAllRuntimeRefreshTokens,
  clearRuntimeRefreshTokenHash,
  clearRuntimeRefreshTokensByUser,
  findRuntimeUserByEmail,
  findRuntimeUserById,
  getRuntimeRefreshTokenHash,
  setRuntimeRefreshTokenHash,
} from "../utils/runtimeStore.js";
import { normalizeRole, sanitizeUser } from "../utils/authUser.js";
import { verifyPasswordAgainstUser } from "../utils/passwords.js";
import { sendApiResponse } from "../utils/response.js";
import { assertUserIsActive } from "../utils/userGovernance.js";

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const unauthorized = (message) => new AppError(401, "AUTH_UNAUTHORIZED", message);

const getUserByEmail = async (req, email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  if (isDatabaseConnected(req)) {
    const dbUser = await User.findOne({
      email: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, "i"),
    }).lean();

    if (dbUser) {
      return { user: dbUser, source: "database" };
    }
  }

  const runtimeUser = findRuntimeUserByEmail(req, normalizedEmail);
  if (runtimeUser) {
    return { user: runtimeUser, source: "fallback" };
  }

  return null;
};

const getUserById = async (req, userId) => {
  const normalizedId = String(userId || "");

  if (!normalizedId) {
    return null;
  }

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

const storeRefreshTokenHash = async (req, userId, tokenHash, source) => {
  if (source === "database" && isDatabaseConnected(req)) {
    await User.findByIdAndUpdate(String(userId), { $set: { refreshTokenHash: tokenHash } }, { new: false });
    return;
  }

  setRuntimeRefreshTokenHash(req, userId, tokenHash);
};

const clearRefreshTokenHash = async (req, userId) => {
  if (isDatabaseConnected(req)) {
    await User.findByIdAndUpdate(String(userId), { $unset: { refreshTokenHash: 1 } }, { new: false });
  }

  clearRuntimeRefreshTokenHash(req, userId);
};

export const revokeUserSessions = async (req, userId) => {
  if (isDatabaseConnected(req)) {
    await User.findByIdAndUpdate(String(userId), { $unset: { refreshTokenHash: 1 } }, { new: false });
  }

  clearRuntimeRefreshTokensByUser(req, userId);
};

export const revokeAllSessions = async (req) => {
  if (isDatabaseConnected(req)) {
    await User.updateMany({}, { $unset: { refreshTokenHash: 1 } });
  }

  clearAllRuntimeRefreshTokens(req);
};

const getStoredRefreshTokenHash = (req, resolvedUser) => {
  if (!resolvedUser) {
    return null;
  }

  if (resolvedUser.source === "database" && resolvedUser.user?.refreshTokenHash) {
    return resolvedUser.user.refreshTokenHash;
  }

  return getRuntimeRefreshTokenHash(req, resolvedUser.user?._id);
};

const issueSession = async (req, res, resolvedUser) => {
  const safeUser = sanitizeUser(resolvedUser.user);
  const tokenContext = {
    userId: safeUser._id,
    role: normalizeRole(safeUser.role),
  };

  const accessToken = signAccessToken(tokenContext);
  const refreshToken = signRefreshToken(tokenContext);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await storeRefreshTokenHash(req, safeUser._id, refreshTokenHash, resolvedUser.source);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

  return {
    accessToken,
    user: safeUser,
  };
};

export const login = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      throw createValidationError([
        { field: "email", message: "email is required." },
        { field: "password", message: "password is required." },
      ]);
    }

    const resolvedUser = await getUserByEmail(req, email);

    if (!resolvedUser) {
      throw unauthorized("Invalid email or password.");
    }

    assertUserIsActive(resolvedUser.user, {
      message: "This account is not active. Contact a superadmin.",
    });

    const isPasswordValid = await verifyPasswordAgainstUser(resolvedUser.user, password);

    if (!isPasswordValid) {
      throw unauthorized("Invalid email or password.");
    }

    const session = await issueSession(req, res, resolvedUser);

    sendApiResponse(
      res,
      200,
      {
        message: "Login successful.",
        ...session,
      },
      { source: resolvedUser.source }
    );
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res) => {
  sendApiResponse(
    res,
    200,
    {
      user: req.user,
    },
    { source: req.auth?.source || "system" }
  );
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || String(req.body?.refreshToken || "").trim();

    if (!refreshToken) {
      throw unauthorized("Refresh token is required.");
    }

    const decoded = verifyRefreshToken(refreshToken);
    const resolvedUser = await getUserById(req, decoded.sub);

    if (!resolvedUser) {
      throw unauthorized("Refresh token belongs to a user that no longer exists.");
    }

    assertUserIsActive(resolvedUser.user, {
      message: "This account is not active. Login has been blocked.",
    });

    const storedHash = getStoredRefreshTokenHash(req, resolvedUser);

    if (!storedHash) {
      throw unauthorized("No active session found. Please login again.");
    }

    const matches = await bcrypt.compare(refreshToken, storedHash);

    if (!matches) {
      throw unauthorized("Refresh token is invalid.");
    }

    const session = await issueSession(req, res, resolvedUser);

    sendApiResponse(
      res,
      200,
      {
        message: "Session refreshed.",
        ...session,
      },
      { source: resolvedUser.source }
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    let userId = req.auth?.userId || null;

    if (!userId) {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || String(req.body?.refreshToken || "").trim();

      if (refreshToken) {
        try {
          const decoded = verifyRefreshToken(refreshToken);
          userId = String(decoded.sub || "");
        } catch (_error) {
          userId = null;
        }
      }
    }

    if (!userId) {
      throw unauthorized("You must be logged in to logout.");
    }

    await clearRefreshTokenHash(req, userId);
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());

    sendApiResponse(
      res,
      200,
      {
        message: "Logout successful.",
      },
      { source: req.auth?.source || "system" }
    );
  } catch (error) {
    next(error);
  }
};
