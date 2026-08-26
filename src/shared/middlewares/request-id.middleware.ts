import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * ============================================================================
 * Request ID Middleware
 * ============================================================================
 * Generates a unique UUIDv4 correlation identifier for every incoming HTTP request.
 * Attaches the ID to `req.requestId` and sends it back in the `X-Request-ID` response header.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
};
