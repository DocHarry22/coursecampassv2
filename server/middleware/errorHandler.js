import { AppError } from "../utils/errors.js";
import { applyResponseMetadata } from "../utils/response.js";

export const notFoundHandler = (req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} was not found.`));
};

export const errorHandler = (error, req, res, _next) => {
  const statusCode =
    error instanceof AppError ? error.statusCode : Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const code =
    error instanceof AppError
      ? error.code
      : typeof error?.code === "string" && error.code
        ? error.code
        : "INTERNAL_SERVER_ERROR";
  const message =
    error instanceof AppError
      ? error.message
      : typeof error?.message === "string" && error.message
        ? error.message
        : "An unexpected server error occurred while processing the request.";

  applyResponseMetadata(res, { source: "error", fallbackReason: code.toLowerCase() });

  const responsePayload = {
    error: {
      code,
      message,
      details: error instanceof AppError ? error.details : error?.details || null,
    },
    requestId: req.requestId ?? null,
  };

  if (process.env.NODE_ENV !== "production" && !(error instanceof AppError)) {
    responsePayload.error.stack = error.stack;
  }

  res.status(statusCode).json(responsePayload);
};
