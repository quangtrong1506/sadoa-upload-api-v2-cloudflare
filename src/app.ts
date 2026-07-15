import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { randomBytes } from "node:crypto";
import { errorHandler } from "./api/middleware/error-handler";
import { notFoundHandler } from "./api/middleware/not-found";
import { createRateLimiter } from "./api/middleware/rate-limit";
import { requestLogger } from "./api/middleware/request-logger";
import { registerRoutes } from "./api/routes";
import imageGetRouter from "./api/routes/image-get.route";
import { getEnv } from "./config/env";
import { registerDocsRoutes } from "./docs/swagger";
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

  // Per-request CSP nonce for the inline scripts/styles on the docs page.
  app.use((_req, res, next) => {
    res.locals.nonce = randomBytes(16).toString("base64");
    next();
  });

  // Security & standard headers. The CSP is relaxed enough to allow the Swagger
  // UI assets that are served from the unpkg CDN on the /docs page, while still
  // gating inline scripts behind a per-request nonce.
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://unpkg.com",
            (_req, res) => `'nonce-${(res as import("express").Response).locals.nonce}'`,
          ],
          scriptSrcElem: [
            "'self'",
            "https://unpkg.com",
            (_req, res) => `'nonce-${(res as import("express").Response).locals.nonce}'`,
          ],
          styleSrc: ["'self'", "https://unpkg.com", "'unsafe-inline'"],
          styleSrcElem: ["'self'", "https://unpkg.com", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://unpkg.com", "https:"],
          fontSrc: ["'self'", "https://unpkg.com", "data:"],
          connectSrc: ["'self'", "https://unpkg.com"],
          workerSrc: ["'self'", "blob:"],
        },
      },
    }),
  );

  // CORS. `*` keeps a permissive default; otherwise build an allow-list.
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : allowedOrigins,
      credentials: env.CORS_ORIGIN !== "*",
    }),
  );

  // Body parsing.
  app.use(express.json({ limit: "3mb" }));
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

  // Public image retrieval, served from the root `/images` path (no /api prefix).
  app.use("/images", imageGetRouter);

  // OpenAPI documentation (mounted outside the API prefix).
  app.use(registerDocsRoutes());

  // 404 + central error handling (order matters: not-found first, then handler).
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info({ app: env.APP_NAME, prefix: env.API_PREFIX }, "Express application initialised");

  return app;
}

const app = createApp();
export default app;
