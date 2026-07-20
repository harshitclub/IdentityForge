import { Router } from "express";
import {
  health,
  info,
  live,
  ready,
  resetCache,
  version,
} from "./system.controller.js";

const systemRoutes = Router();

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
 */
systemRoutes.get("/live", live);

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
 */
systemRoutes.post("/cache/reset", resetCache);
// systemRoutes.get("/metrics");

export default systemRoutes;
