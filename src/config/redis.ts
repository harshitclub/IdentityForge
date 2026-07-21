import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "../shared/logging/logger.js";
import { LOG_EVENTS } from "../constants/index.js";

const createRedisConnection = () => {
  const redis = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  });

  redis.on("connect", () => {
    logger.info({
      event: LOG_EVENTS.REDIS_CONNECTED,
      component: "Redis",
    });
  });

  redis.on("ready", () => {
    logger.info({
      event: LOG_EVENTS.REDIS_READY,
      component: "Redis",
    });
  });

  redis.on("error", (error) => {
    logger.error({
      event: LOG_EVENTS.REDIS_ERROR,
      component: "Redis",
      error: {
        message: error.message,
      },
    });
  });

  redis.on("close", () => {
    logger.warn({
      event: LOG_EVENTS.REDIS_CONNECTION_CLOSED,
      component: "Redis",
    });
  });

  return redis;
};

export const cacheRedis = createRedisConnection();
