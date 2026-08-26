import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";

/**
 * ============================================================================
 * 404 Not Found Middleware
 * ============================================================================
 * Catches unhandled routes that do not match any defined Express routers
 * and creates a structured 404 AppError forwarded to the global error pipeline.
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
};
