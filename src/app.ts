import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { getEnv } from "./config/env";
import { registerRoutes } from "./api/routes";
import { requestLogger } from "./api/middleware/request-logger";
import { errorHandler } from "./api/middleware/error-handler";
import { notFoundHandler } from "./api/middleware/not-found";
import { createRateLimiter } from "./api/middleware/rate-limit";
import { logger } from "./utils/logger";

/**
 * Builds the Express application.
 *
 * Centralises middleware registration and route mounting. Importing this module
 * does NOT start a server and does NOT touch any Cloudflare-specific API, which
 * is what lets the same `app` be exercised directly in Vitest (supertest) and
 * wrapped by `httpServerHandler` on the Workers runtime.
 */
export function createApp(): Express {
  const env = getEnv();
  const app = express();

  app.set("trust proxy", 1);

  // Security & standard headers.
  app.use(helmet());

  // CORS. `*` keeps a permissive default; otherwise build an allow-list.
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : allowedOrigins,
      credentials: env.CORS_ORIGIN !== "*",
    }),
  );

  // Body parsing.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Observability: structured request logging + in-memory rate limiting.
  app.use(requestLogger);
  app.use(
    createRateLimiter({
      max: env.RATE_LIMIT_MAX,
      windowMs: env.RATE_LIMIT_WINDOW_MS,
    }),
  );

  // Routes mounted under the configured API prefix (e.g. /api).
  app.use(env.API_PREFIX, registerRoutes(env.API_PREFIX));

  // 404 + central error handling (order matters: not-found first, then handler).
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info({ app: env.APP_NAME, prefix: env.API_PREFIX }, "Express application initialised");

  return app;
}

const app = createApp();
export default app;
