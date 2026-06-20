import type { Request, Response, NextFunction } from "express";

import { ZodError } from "zod";
import jwt from "jsonwebtoken";

import { AppError } from "../utils/appError.js";
import { apiResponse } from "../utils/apiResponse.js";

import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../constants/index.js";
import { logger } from "../../config/logger.js";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message: string = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
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
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.INVALID_TOKEN;
  } else if (err instanceof jwt.TokenExpiredError) {
    /**
     * JWT Expired Error
     */
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.TOKEN_EXPIRED;
  } else {
    /**
     * Unknown Errors
     */
    message = err.message || message;
  }

  /**
   * Winston Logging
   */
  logger.error("Unhandled exception", {
    event: LOG_EVENTS.UNHANDLED_EXCEPTION,
    operation: "globalErrorHandler",
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: err,
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
