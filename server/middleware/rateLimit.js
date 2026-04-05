import rateLimit from "express-rate-limit";
import { applyResponseMetadata } from "../utils/response.js";

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      applyResponseMetadata(res, { source: "error", fallbackReason: "rate_limited" });
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message,
          details: null,
        },
        requestId: req.requestId || null,
      });
    },
  });

export const apiRateLimiter = createLimiter({
  windowMs: toPositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.API_RATE_LIMIT_MAX, 300),
  message: "Too many requests. Please retry in a few minutes.",
});

export const authRateLimiter = createLimiter({
  windowMs: toPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 25),
  message: "Too many authentication attempts. Please retry later.",
});
