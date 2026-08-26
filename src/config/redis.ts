import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "../shared/logging/logger.js";
import { LOG_EVENTS } from "../constants/index.js";

/**
 * ============================================================================
 * Redis Client Configuration (ioRedis)
 * ============================================================================
 * Establishes an ioRedis connection pool for application cache-aside queries,
 * rate limiting counters, and session tracking with comprehensive event telemetry.
 */

/**
 * Creates and configures a Redis client instance with lifecycle listeners.
 *
 * @returns Connected Redis client instance
 */
const createRedisConnection = () => {
  const redis = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  });

  // Emitted when connection is initiated
  redis.on("connect", () => {
    logger.info({
      event: LOG_EVENTS.REDIS_CONNECTED,
      component: "Redis",
    });
  });

  // Emitted when Redis is ready to accept commands
  redis.on("ready", () => {
    logger.info({
      event: LOG_EVENTS.REDIS_READY,
      component: "Redis",
    });
  });

  // Emitted on connection errors
  redis.on("error", (error) => {
    logger.error({
      event: LOG_EVENTS.REDIS_ERROR,
      component: "Redis",
      error: {
        message: error.message,
      },
    });
  });

  // Emitted when connection is closed
  redis.on("close", () => {
    logger.warn({
      event: LOG_EVENTS.REDIS_CONNECTION_CLOSED,
      component: "Redis",
    });
  });

  return redis;
};

/**
 * Primary Redis cache client singleton for application caching and rate limiting.
 */
export const cacheRedis = createRedisConnection();
