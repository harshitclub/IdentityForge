import type { NextFunction, Request, Response } from "express";

import { logger } from "../logging/logger.js";
import { LOG_EVENTS } from "../../constants/index.js";

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  logger.info({
    event: LOG_EVENTS.REQUEST_STARTED,
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    protocol: req.protocol,
    userAgent: req.get("User-Agent"),
  });

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
