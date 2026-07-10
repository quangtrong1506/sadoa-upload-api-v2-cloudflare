import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../api/responses";
import type { AppEnv } from "../config/env";

/** Shared application types used across the API layer. */

export type { ApiResponse, AppEnv };

/** Convenience alias for async Express route handlers. */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;
