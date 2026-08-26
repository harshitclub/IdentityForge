import type { NextFunction, Request, Response } from "express";
import { logger } from "../logging/logger.js";
import { LOG_EVENTS } from "../../constants/index.js";

/**
 * ============================================================================
 * Request Logger Middleware
 * ============================================================================
 * Emits structured Winston log events when an HTTP request arrives (`REQUEST_STARTED`)
 * and upon response completion (`REQUEST_COMPLETED`), recording latency, status code,
 * request method, URL, and client metadata.
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  // Log incoming request start
  logger.info({
    event: LOG_EVENTS.REQUEST_STARTED,
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    protocol: req.protocol,
    userAgent: req.get("User-Agent"),
  });

  // Attach completion listener to calculate response latency
  res.on("finish", () => {
    const durationMs = Date.now() - start;

    logger.info({
      event: LOG_EVENTS.REQUEST_COMPLETED,
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      protocol: req.protocol,
      userAgent: req.get("User-Agent"),
    });
  });

  next();
};
