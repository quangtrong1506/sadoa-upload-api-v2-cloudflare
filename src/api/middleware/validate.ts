import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../../utils/app-error";

/**
 * Builds an Express middleware that validates the request `body` against a Zod
 * schema. On failure it throws an `AppError` (422) with flattened field errors
 * instead of letting Zod throw a raw exception that would surface as a 500.
 *
 * On success the validated (and coerced) value replaces `req.body` so
 * downstream controllers can trust its type.
 */
export function validateBody<T extends ZodSchema>(
  schema: T,
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(AppError.unprocessableEntity("Request validation failed", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}
