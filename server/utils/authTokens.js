import jwt from "jsonwebtoken";
import { AppError } from "./errors.js";

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "coursecampass-dev-access-token-secret";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || "coursecampass-dev-refresh-token-secret";

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE_NAME = "cc_refresh_token";

export const signAccessToken = ({ userId, role }) =>
  jwt.sign({ role }, ACCESS_TOKEN_SECRET, {
    subject: String(userId),
    expiresIn: ACCESS_TOKEN_TTL,
  });

export const signRefreshToken = ({ userId, role }) =>
  jwt.sign({ role }, REFRESH_TOKEN_SECRET, {
    subject: String(userId),
    expiresIn: REFRESH_TOKEN_TTL,
  });

const createTokenError = (code, message) => new AppError(401, code, message);

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (_error) {
    throw createTokenError("AUTH_INVALID_TOKEN", "Access token is missing, expired, or invalid.");
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (_error) {
    throw createTokenError("AUTH_INVALID_REFRESH_TOKEN", "Refresh token is missing, expired, or invalid.");
  }
};

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/auth",
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
});
