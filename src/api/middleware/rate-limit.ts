import type { NextFunction, Request, Response } from "express";

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window per client. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Optional custom key extractor (defaults to the client IP). */
  keyGenerator?: (req: Request) => string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window in-memory rate limiter.
 *
 * Note: Cloudflare Workers are distributed across many isolates, so this simple
 * Map is per-isolate and NOT a global limit. For a globally consistent limit
 * use a binding such as Workers KV / Durable Objects. The implementation below
 * is sufficient for a self-contained base template and demonstrates the pattern.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { max, windowMs } = options;
  const keyGenerator = options.keyGenerator ?? ((req: Request) => getClientIp(req));
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(max - 1, 0)));
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({
        success: false,
        message: "Too many requests, please try again later",
      });
      return;
    }

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(max - bucket.count, 0)));
    next();
  };
}

function getClientIp(req: Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string") {
    return cfIp;
  }
  return req.ip ?? "unknown";
}
