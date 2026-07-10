import type { NextFunction, Request, Response } from "express";
import { logger } from "../../utils/logger";

/**
 * Request logging middleware backed by Pino.
 *
 * Records the inbound request plus the resulting status code and latency once
 * the response is finished. The log level escalates to `warn` for 4xx and
 * `error` for 5xx responses.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on("finish", () => {
    const latencyMs = Date.now() - startedAt;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[level](
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        latencyMs,
        ip: req.ip,
      },
      "request",
    );
  });

  next();
}
