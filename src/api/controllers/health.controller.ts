import type { Request, Response } from "express";
import { httpResponse } from "../responses";
import { getHealth } from "../../services/health.service";

export function healthCheck(_req: Request, res: Response): void {
  const health = getHealth();
  httpResponse.ok(res, health, "API running");
}
