import { Router } from "express";
import {
  health,
  info,
  live,
  metrics,
  ready,
  resetCache,
  version,
} from "./system.controller.js";
import { authenticateUser } from "../../shared/middlewares/authenticate.user.js";
import { authenticateAdmin } from "../../shared/middlewares/authenticate.admin.js";
import { rateLimiter } from "../../shared/middlewares/redisRateLimiter.js";

/**
 * ============================================================================
 * System Routes
 * ============================================================================
 * Probes for Kubernetes / Docker orchestrators (Liveness, Readiness, Health),
 * runtime diagnostics, Prometheus scraping, and administrative cache flush.
 */
const systemRoutes = Router();

/**
 * ----------------------------------------------------------------------------
 * 1. Health & Orchestration Probes
 * ----------------------------------------------------------------------------
 */

/**
 * @swagger
 * /system/health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check
 *     description: Checks the health status of the application and its dependencies such as the database and Redis.
 *
 *     responses:
 *       200:
 *         description: Application is healthy.
 *       503:
 *         description: Application is unhealthy.
 */
systemRoutes.get("/health", health);

/**
 * @swagger
 * /system/ready:
 *   get:
 *     tags:
 *       - System
 *     summary: Readiness check
 *     description: Checks whether the application is ready to accept incoming requests.
 *
 *     responses:
 *       200:
 *         description: Application is ready.
 *       503:
 *         description: Application is not ready.
 */
systemRoutes.get("/ready", ready);

/**
 * @swagger
 * /system/live:
 *   get:
 *     tags:
 *       - System
 *     summary: Liveness check
 *     description: Checks whether the application process is running.
 *
 *     responses:
 *       200:
 *         description: Application is alive.
 *       503:
 *         description: Application is not alive.
 */
systemRoutes.get("/live", live);

/**
 * ----------------------------------------------------------------------------
 * 2. Version & Diagnostics
 * ----------------------------------------------------------------------------
 */

/**
 * @swagger
 * /system/version:
 *   get:
 *     tags:
 *       - System
 *     summary: Get application version
 *     description: Retrieves the application's name and current version.
 *
 *     responses:
 *       200:
 *         description: Application version retrieved successfully.
 */
systemRoutes.get("/version", version);

/**
 * @swagger
 * /system/info:
 *   get:
 *     tags:
 *       - System
 *     summary: Get application information
 *     description: Retrieves general information about the application and its runtime environment.
 *
 *     responses:
 *       200:
 *         description: Application information retrieved successfully.
 */
systemRoutes.get("/info", info);

/**
 * ----------------------------------------------------------------------------
 * 3. Cache Maintenance & Prometheus Metrics
 * ----------------------------------------------------------------------------
 */

/**
 * @swagger
 * /system/cache/reset:
 *   post:
 *     tags:
 *       - System
 *     summary: Clear Redis cache
 *     description: Clears all Redis cache entries. Intended for development and testing only.
 *
 *     responses:
 *       200:
 *         description: Redis cache cleared successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Admin access required.
 */
systemRoutes.post(
  "/cache/reset",
  rateLimiter,
  authenticateUser,
  authenticateAdmin,
  resetCache,
);

/**
 * Endpoint for Prometheus scraper to collect HTTP and system metrics.
 */
systemRoutes.get("/metrics", metrics);

export default systemRoutes;
