import { Router } from "express";
import healthRouter from "./health.route";
import imageRouter from "./image.route";

/**
 * Mounts all versioned / domain API routers under the configured API prefix.
 * New feature routers are registered here.
 */
export function registerRoutes(apiPrefix: string): Router {
  const router = Router();

  router.use("/health", healthRouter);
  router.use("/images", imageRouter);

  // Convenience alias so `GET /api` also answers the health check.
  router.get("/", (_req, res) => {
    res.redirect(`${apiPrefix}/health`);
  });

  return router;
}
