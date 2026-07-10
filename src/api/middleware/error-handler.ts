import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../../utils/logger";
import { isAppError } from "../../utils/app-error";

/**
 * Global Express error handler.
 *
 * Must be registered last. It maps known error types to structured responses:
 *  - AppError            -> its own statusCode + message + details
 *  - ZodError           -> 422 with flattened field errors
 *  - everything else    -> 500 (never leak raw stack traces to the client)
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // `next` is required so Express identifies this as an error-handling
  // middleware (4-arity). It is intentionally unused.
  _next: NextFunction,
): void => {
  if (res.headersSent) {
    return;
  }

  if (isAppError(err)) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details === undefined ? {} : { errors: err.details }),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten(),
    });
    return;
  }

  const statusCode = 500;
  const message = "Internal Server Error";
  logger.error(
    {
      err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    },
    "unhandled error",
  );

  res.status(statusCode).json({ success: false, message });
};
