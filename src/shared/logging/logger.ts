import winston from "winston";
import os from "os";
import util from "node:util";
import { env } from "../../config/env.js";

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

/**
 * ----------------------------------------
 * Console Format (Development)
 * ----------------------------------------
 */
const consoleFormat = printf((info) => {
  const {
    timestamp,
    level,
    stack,

    // internal metadata
    service,
    environment,
    hostname,
    pid,

    ...meta
  } = info;

  let output = `${timestamp} ${level.toUpperCase()}`;

  if (stack) {
    output += `\n${stack}`;
  }

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
 * ----------------------------------------
 * Base Metadata
 * ----------------------------------------
 */
const metadataFormat = winston.format((info) => {
  info.service = env.APP_NAME;
  info.environment = env.NODE_ENV;
  info.hostname = os.hostname();
  info.pid = process.pid;

  return info;
});

/**
 * ----------------------------------------
 * Logger
 * ----------------------------------------
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
    new winston.transports.File({
      filename: "logs/combined.log",
    }),

    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
  ],
});

/**
 * ----------------------------------------
 * Development Console
 * ----------------------------------------
 */
if (env.NODE_ENV !== "production") {
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
}
