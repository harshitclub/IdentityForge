import winston from "winston";
import os from "os";
import util from "node:util";
import { env } from "../../config/env.js";

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

/**
 * ============================================================================
 * Structured Logging Configuration (Winston)
 * ============================================================================
 * Centralized logging infrastructure that supports:
 * - Environment-aware formatting (pretty-printed in Dev, structured JSON in Prod).
 * - Automatic system metadata injection (service name, environment, hostname, PID).
 * - Persistent rotating file transports (`logs/combined.log`, `logs/error.log`).
 * - Full stack trace capture for unhandled errors and operational warnings.
 */

/**
 * ----------------------------------------------------------------------------
 * 1. Development Console Formatter
 * ----------------------------------------------------------------------------
 * Formats log messages for human readability in terminal environments during
 * local development with color-coded levels, timestamps, and inspected objects.
 */
const consoleFormat = printf((info) => {
  const {
    timestamp,
    level,
    stack,

    // Base system metadata
    service,
    environment,
    hostname,
    pid,

    ...meta
  } = info;

  let output = `${timestamp} ${level.toUpperCase()}`;

  // Append error stack trace if available
  if (stack) {
    output += `\n${stack}`;
  }

  // Pretty-print metadata payloads with depth and color
  if (Object.keys(meta).length > 0) {
    output +=
      "\n" +
      util.inspect(meta, {
        colors: true,
        depth: null,
        compact: false,
      });
  }

  return output;
});

/**
 * ----------------------------------------------------------------------------
 * 2. System Metadata Enricher
 * ----------------------------------------------------------------------------
 * Custom Winston format that automatically attaches environment and process
 * context to every emitted log entry.
 */
const metadataFormat = winston.format((info) => {
  info.service = env.APP_NAME;
  info.environment = env.NODE_ENV;
  info.hostname = os.hostname();
  info.pid = process.pid;

  return info;
});

/**
 * ----------------------------------------------------------------------------
 * 3. Base Logger Instance & File Transports
 * ----------------------------------------------------------------------------
 * Initializes the root Winston logger with persistent file outputs.
 */
export const logger = winston.createLogger({
  level: "info",

  format: combine(
    timestamp(),
    errors({ stack: true }),
    metadataFormat(),
    json(),
  ),

  transports: [
    // Stores all log entries (info, warn, error)
    new winston.transports.File({
      filename: "logs/combined.log",
    }),

    // Stores error-level entries exclusively
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
  ],
});

/**
 * ----------------------------------------------------------------------------
 * 4. Environment-Adaptive Console Transports
 * ----------------------------------------------------------------------------
 */
if (env.NODE_ENV !== "production") {
  // Development: Human-friendly colorized console output
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        errors({ stack: true }),
        metadataFormat(),
        consoleFormat,
      ),
    }),
  );
} else {
  // Production: High-performance single-line JSON output for log aggregators
  logger.add(
    new winston.transports.Console({
      format: combine(
        timestamp(),
        errors({ stack: true }),
        metadataFormat(),
        json(),
      ),
    }),
  );
}
