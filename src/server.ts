import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

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
