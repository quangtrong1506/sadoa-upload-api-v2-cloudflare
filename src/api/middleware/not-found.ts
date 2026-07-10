import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/app-error";

/**
 * 404 handler. Registered after all routes; forwards an operational not-found
 * error that the global error handler turns into a structured response.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
