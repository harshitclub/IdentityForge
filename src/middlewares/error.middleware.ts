import type { Request, Response, NextFunction } from "express";

import { ZodError } from "zod";
import jwt from "jsonwebtoken";

import { AppError } from "../utils/appError.js";
import { apiResponse } from "../utils/apiResponse.js";

import { logger } from "../config/logger.js";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any[] = [];

  /**
   * Custom App Error
   */
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    /**
     * Zod Validation Error
     */
    statusCode = 400;
    message = "Validation Failed";

    errors = err.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
  } else if (err instanceof jwt.JsonWebTokenError) {
    /**
     * JWT Invalid Error
     */
    statusCode = 401;
    message = "Invalid token";
  } else if (err instanceof jwt.TokenExpiredError) {
    /**
     * JWT Expired Error
     */
    statusCode = 401;
    message = "Token expired";
  } else {
    /**
     * Unknown Errors
     */
    message = err.message || message;
  }

  /**
   * Winston Logging
   */
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    statusCode,
  });

  /**
   * Development Response
   */
  if (process.env.NODE_ENV === "development") {
    return apiResponse({
      req,
      res,
      statusCode,
      success: false,
      message,
      errors: errors.length ? errors : err.stack,
    });
  }

  /**
   * Production Response
   */
  return apiResponse({
    req,
    res,
    statusCode,
    success: false,
    message,
    ...(errors.length ? { errors } : {}),
  });
};
