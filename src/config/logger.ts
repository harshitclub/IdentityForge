import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "./env.js";

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

/**
 * -----------------------------------
 * Console Format (Development)
 * -----------------------------------
 */
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

/**
 * -----------------------------------
 * Logger Instance
 * -----------------------------------
 */
export const logger = winston.createLogger({
  level: "info",

  format: combine(
    timestamp(),
    errors({ stack: true }),
    winston.format((info) => {
      info.service = "identity-forge";

      return info;
    })(),
    json(),
  ),

  transports: [
    /**
     * -----------------------------------
     * Error Logs
     * -----------------------------------
     */
    new DailyRotateFile({
      level: "error",
      dirname: "logs/error",
      filename: "%DATE%.error.log",
      datePattern: "YYYY-MM-DD",

      zippedArchive: true,

      maxSize: "20m",

      maxFiles: "7d",
    }),

    /**
     * -----------------------------------
     * HTTP Logs
     * -----------------------------------
     */
    new DailyRotateFile({
      level: "http",
      dirname: "logs/http",
      filename: "%DATE%.http.log",
      datePattern: "YYYY-MM-DD",

      zippedArchive: true,

      maxSize: "20m",

      maxFiles: "7d",
    }),

    /**
     * -----------------------------------
     * Info Logs
     * -----------------------------------
     */
    new DailyRotateFile({
      level: "info",
      dirname: "logs/info",
      filename: "%DATE%.info.log",
      datePattern: "YYYY-MM-DD",

      zippedArchive: true,

      maxSize: "20m",

      maxFiles: "7d",
    }),

    /**
     * -----------------------------------
     * Combined Logs
     * -----------------------------------
     */
    new DailyRotateFile({
      dirname: "logs/combined",
      filename: "%DATE%.combined.log",
      datePattern: "YYYY-MM-DD",

      zippedArchive: true,

      maxSize: "20m",

      maxFiles: "7d",
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        errors({ stack: true }),
        consoleFormat,
      ),
    }),
  );
}
