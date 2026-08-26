import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { cacheRedis } from "./config/redis.js";
import { emailWorker } from "./jobs/workers/email.worker.js";
import { LOG_EVENTS } from "./constants/index.js";
import { logger } from "./shared/logging/logger.js";

const PORT = env.PORT;
const HOST = "0.0.0.0";

/**
 * ----------------------------------------------------------------------------
 * 1. HTTP Server Initialization
 * ----------------------------------------------------------------------------
 */
const server = app.listen(PORT, () => {
  logger.info({
    event: LOG_EVENTS.SERVER_STARTED,
    component: "Server",
    pid: process.pid,
    environment: env.NODE_ENV,
    port: PORT,
  });

  const serverUrl =
    env.NODE_ENV === "development"
      ? `http://localhost:${PORT}`
      : `http://${HOST}:${PORT}`;

  logger.info({
    event: LOG_EVENTS.SERVER_ADDRESS,
    component: "Server",
    url: serverUrl,
  });
});

/**
 * ----------------------------------------------------------------------------
 * 2. Graceful Shutdown Coordinator
 * ----------------------------------------------------------------------------
 * Gracefully terminates incoming HTTP traffic, finishes background workers,
 * drains active Redis connections, and disconnects Prisma ORM.
 */
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.warn({
    event: LOG_EVENTS.SHUTDOWN_STARTED,
    component: "Server",
    signal,
  });

  // Force exit fallback if graceful teardown hangs beyond 10 seconds
  const forceExitTimeout = setTimeout(() => {
    logger.error({
      event: LOG_EVENTS.FORCED_SHUTDOWN,
      component: "Server",
      timeoutMs: 10000,
    });

    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  // Stop accepting new connections and close existing HTTP connections
  server.close(async () => {
    try {
      // 1. Close background BullMQ worker
      await emailWorker.close();

      // 2. Disconnect Prisma Database connection pool
      await prisma.$disconnect();

      // 3. Close Redis connection
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
};

// Process Termination Signal Listeners
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

/**
 * ----------------------------------------------------------------------------
 * 3. Process-Level Uncaught Exception & Rejection Handlers
 * ----------------------------------------------------------------------------
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
