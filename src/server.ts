import app from "./app.js";
import { env } from "./config/env.js";
import { cacheRedis } from "./config/redis.js";
import { LOG_EVENTS } from "./constants/index.js";
import "./jobs/workers/email.worker.js";
import { logger } from "./shared/logging/logger.js";

const PORT = env.PORT;
const HOST = "0.0.0.0";

const server = app.listen(PORT, () => {
  logger.info({
    event: LOG_EVENTS.SERVER_STARTED,
    component: "Server",
    pid: process.pid,
    environment: env.NODE_ENV,
    port: PORT,
  });

  if (env.NODE_ENV === "development") {
    logger.info({
      event: LOG_EVENTS.SERVER_ADDRESS,
      component: "Server",
      url: `http://localhost:${PORT}`,
    });
  } else {
    logger.info({
      event: LOG_EVENTS.SERVER_ADDRESS,
      component: "Server",
      url: `http://${HOST}:${PORT}`,
    });
  }
});

/**
 * -----------------------------
 * Graceful Shutdown
 * -----------------------------
 */
const gracefulShutdown = async (signal: string) => {
  logger.warn({
    event: LOG_EVENTS.SHUTDOWN_STARTED,
    component: "Server",
    signal,
  });

  server.close(async () => {
    try {
      await cacheRedis.quit();

      logger.info({
        event: LOG_EVENTS.SHUTDOWN_COMPLETED,
        component: "Server",
      });

      process.exit(0);
    } catch (error) {
      logger.error({
        event: LOG_EVENTS.SHUTDOWN_FAILED,
        component: "Server",
        error,
      });

      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error({
      event: LOG_EVENTS.FORCED_SHUTDOWN,
      component: "Server",
      timeoutMs: 10000,
    });

    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

/**
 * -----------------------------
 * Process-Level Error Handling
 * -----------------------------
 */
process.on("unhandledRejection", (reason) => {
  logger.error({
    event: LOG_EVENTS.UNHANDLED_REJECTION,
    component: "Server",
    error: reason,
  });
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  logger.error({
    event: LOG_EVENTS.UNCAUGHT_EXCEPTION,
    component: "Server",
    err,
  });
  server.close(() => process.exit(1));
});
