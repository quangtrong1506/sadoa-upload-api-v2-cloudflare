/**
 * Operational error type thrown by the application.
 *
 * Extends the native `Error` and carries an HTTP `statusCode`, a client-safe
 * `message` and optional `details` (used by the error handler to produce a
 * structured 422 / 400 body). These are "expected" errors; anything that is not
 * an `AppError` is treated as an unexpected server fault.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational = true as const;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;

    // Restore prototype chain when targeting ES5/ES2015 runtimes.
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = "Bad Request", details?: unknown): AppError {
    return new AppError(400, message, details);
  }

  static unauthorized(message = "Unauthorized", details?: unknown): AppError {
    return new AppError(401, message, details);
  }

  static forbidden(message = "Forbidden", details?: unknown): AppError {
    return new AppError(403, message, details);
  }

  static notFound(message = "Not Found", details?: unknown): AppError {
    return new AppError(404, message, details);
  }

  static conflict(message = "Conflict", details?: unknown): AppError {
    return new AppError(409, message, details);
  }

  static unprocessableEntity(message = "Validation failed", details?: unknown): AppError {
    return new AppError(422, message, details);
  }

  static internal(message = "Internal Server Error", details?: unknown): AppError {
    return new AppError(500, message, details);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
