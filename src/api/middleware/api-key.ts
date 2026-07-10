import type { NextFunction, Request, Response } from "express";
import { getEnv } from "../../config/env";
import { AppError } from "../../utils/app-error";

/**
 * Validates the `x-api-key` header against the configured `X_API_KEY`.
 * Rejects with 401 when the key is missing or incorrect.
 */
export function apiKeyMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey !== "string" || apiKey !== getEnv().X_API_KEY) {
    next(AppError.unauthorized("Invalid or missing API key"));
    return;
  }
  next();
}
