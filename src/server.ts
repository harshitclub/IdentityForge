import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { cacheRedis } from "./config/redis.js";
import "./jobs/workers/email.worker.js";

const PORT = env.PORT;
const HOST = "0.0.0.0";

const server = app.listen(PORT, () => {
  logger.info(
    `🚀 Server (PID: ${process.pid}) running in ${env.NODE_ENV} mode`,
  );

  if (env.NODE_ENV === "development") {
    logger.info(`🔗 Local: http://localhost:${PORT}`);
  } else {
    logger.info(`🔗 Network: http://${HOST}:${PORT}`);
  }
});

/**
 * -----------------------------
 * Graceful Shutdown
 * -----------------------------
 */
const gracefulShutdown = async (signal: string) => {
  logger.warn(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    try {
      await cacheRedis.quit();

      logger.info("Cleanup complete. Exiting.");

      process.exit(0);
    } catch (error) {
      logger.error("Shutdown cleanup failed", error);

      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");

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
  logger.error("Unhandled Rejection", reason);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", err);
  server.close(() => process.exit(1));
});
