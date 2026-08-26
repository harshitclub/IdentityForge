import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { cacheRedis } from "../../config/redis.js";
import { SUCCESS_MESSAGES } from "../../constants/index.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { checkDependencies, getApplicationInfo } from "./system.service.js";
import { register } from "../../metrics/prometheus.js";

/**
 * ============================================================================
 * System Controller Handlers
 * ============================================================================
 * Request handlers for system health probes, readiness checks, diagnostic info,
 * cache clearing, and Prometheus metrics scraping.
 */

/**
 * ----------------------------------------------------------------------------
 * 1. Health Probe Handler
 * ----------------------------------------------------------------------------
 * @desc    Comprehensive health check verifying PostgreSQL and Redis connectivity.
 * @route   GET /system/health
 * @access  Public
 */
export const health = asyncHandler(async (req: Request, res: Response) => {
  const { database, redis } = await checkDependencies();
  const healthy = database && redis;

  return apiResponse({
    req,
    res,
    statusCode: healthy ? 200 : 503,
    message: healthy ? "Application is healthy." : "Application is unhealthy.",
    data: {
      status: healthy ? "healthy" : "unhealthy",
      services: {
        database: database ? "up" : "down",
        redis: redis ? "up" : "down",
      },
    },
  });
});

/**
 * ----------------------------------------------------------------------------
 * 2. Readiness Probe Handler
 * ----------------------------------------------------------------------------
 * @desc    Readiness check for load balancers and container orchestrators.
 * @route   GET /system/ready
 * @access  Public
 */
export const ready = asyncHandler(async (req: Request, res: Response) => {
  const { database, redis } = await checkDependencies();
  const isReady = database && redis;

  return apiResponse({
    req,
    res,
    statusCode: isReady ? 200 : 503,
    message: isReady ? "Application is ready." : "Application is not ready.",
    data: {
      ready: isReady,
      services: {
        database: database ? "up" : "down",
        redis: redis ? "up" : "down",
      },
    },
  });
});

/**
 * ----------------------------------------------------------------------------
 * 3. Liveness Probe Handler
 * ----------------------------------------------------------------------------
 * @desc    Liveness check confirming the Node.js process is active.
 * @route   GET /system/live
 * @access  Public
 */
export const live = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Application is alive.",
    data: {
      alive: true,
      uptime: Math.floor(process.uptime()),
    },
  });
});

/**
 * ----------------------------------------------------------------------------
 * 4. Application Version Handler
 * ----------------------------------------------------------------------------
 * @desc    Returns application name and semver release.
 * @route   GET /system/version
 * @access  Public
 */
export const version = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Application version fetched successfully.",
    data: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
    },
  });
});

/**
 * ----------------------------------------------------------------------------
 * 5. Application Info Handler
 * ----------------------------------------------------------------------------
 * @desc    Returns runtime metadata including platform, Node.js version, PID, and uptime.
 * @route   GET /system/info
 * @access  Public
 */
export const info = asyncHandler(async (req: Request, res: Response) => {
  const applicationInfo = getApplicationInfo();

  return apiResponse({
    req,
    res,
    message: "Application information fetched successfully.",
    data: applicationInfo,
  });
});

/**
 * ----------------------------------------------------------------------------
 * 6. Reset Redis Cache Handler
 * ----------------------------------------------------------------------------
 * @desc    Flushes all keys in Redis cache (Dev/Testing/Admin utility).
 * @route   POST /system/cache/reset
 * @access  Private (Admin only)
 */
export const resetCache = asyncHandler(async (req: Request, res: Response) => {
  await cacheRedis.flushall();

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.CACHE_RESET,
  });
});

/**
 * ----------------------------------------------------------------------------
 * 7. Prometheus Metrics Scrape Handler
 * ----------------------------------------------------------------------------
 * @desc    Exposes application metrics for Prometheus scraping.
 * @route   GET /system/metrics
 * @access  Public (Scraper endpoint)
 */
export const metrics = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", register.contentType);
  res.end(await register.metrics());
});
