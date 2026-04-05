export class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export const createValidationError = (details, message = "Invalid query parameters.") =>
  new AppError(400, "VALIDATION_ERROR", message, details);
