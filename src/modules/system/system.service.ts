import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { cacheRedis } from "../../config/redis.js";

/**
 * ============================================================================
 * System Service & Health Types
 * ============================================================================
 * Interfaces and probe helpers for verifying database and Redis connectivity,
 * application uptime, and platform runtime metadata.
 */

/**
 * Health probe status for external infrastructure dependencies.
 */
export interface HealthStatus {
  database: boolean;
  redis: boolean;
}

/**
 * Readiness probe status indicating if system can accept traffic.
 */
export interface ReadinessStatus {
  database: boolean;
  redis: boolean;
}

/**
 * Detailed application and Node.js process runtime metadata.
 */
export interface ApplicationInfo {
  name: string;
  version: string;
  environment: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  pid: number;
  uptime: number;
}

/**
 * ----------------------------------------------------------------------------
 * Check Infrastructure Dependencies
 * ----------------------------------------------------------------------------
 * Pings PostgreSQL (via raw SELECT 1) and Redis (via PING) to verify connectivity.
 *
 * @returns Status boolean flags for database and redis
 */
export const checkDependencies = async (): Promise<HealthStatus> => {
  let database = false;
  let redis = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    // Database connection failed
  }

  try {
    await cacheRedis.ping();
    redis = true;
  } catch {
    // Redis connection failed
  }

  return {
    database,
    redis,
  };
};

/**
 * ----------------------------------------------------------------------------
 * Get Application Information
 * ----------------------------------------------------------------------------
 * Gathers server runtime details: app version, environment, Node version, PID, and uptime.
 *
 * @returns ApplicationInfo object
 */
export const getApplicationInfo = (): ApplicationInfo => {
  return {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    environment: env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
  };
};
