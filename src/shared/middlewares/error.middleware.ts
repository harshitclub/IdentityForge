import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../constants/index.js";
import { getRequestLogger } from "../request-context/request-context.js";
import { apiResponse } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

/**
 * ============================================================================
 * Central Global Error Handling Middleware
 * ============================================================================
 * Intercepts all rejected promises and synchronous errors from routes and middlewares.
 * Differentiates operational AppErrors, Zod validation failures, JWT token errors,
 * and uncaught exceptions. Formats standardized error response envelopes and masks
 * stack traces in production mode.
 */
export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const logger = getRequestLogger();

  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  let errors: Array<{ field: string; message: string }> = [];

  // Branch 1: Custom Operational Application Errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;

    logger.warn({
      event: LOG_EVENTS.OPERATIONAL_ERROR,
      component: "GlobalErrorHandler",
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: {
        name: err.name,
        message: err.message,
        isOperational: err.isOperational,
      },
    });
  } else if (err instanceof ZodError) {
    // Branch 2: Schema Validation Failures
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Validation Failed";

    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    logger.warn({
      event: LOG_EVENTS.VALIDATION_FAILED,
      component: "GlobalErrorHandler",
      method: req.method,
      path: req.originalUrl,
      statusCode,
      validationErrors: errors,
    });
  } else if (err instanceof jwt.TokenExpiredError) {
    // Branch 3: Expired JWT Tokens
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.TOKEN_EXPIRED;

    logger.warn({
      event: LOG_EVENTS.TOKEN_EXPIRED,
      component: "GlobalErrorHandler",
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: {
        name: err.name,
        message: err.message,
      },
    });
  } else if (err instanceof jwt.JsonWebTokenError) {
    // Branch 4: Malformed or Invalid JWT Tokens
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.INVALID_TOKEN;

    logger.warn({
      event: LOG_EVENTS.INVALID_TOKEN,
      component: "GlobalErrorHandler",
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: {
        name: err.name,
        message: err.message,
      },
    });
  } else if (
    typeof (err as any)?.status === "number" &&
    (err as any).status >= 400 &&
    (err as any).status < 500
  ) {
    // Branch 5: Express Middleware 4xx Errors (e.g. Body parser syntax errors)
    statusCode = (err as any).status;
    message = (err as any).message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

    logger.warn({
      event: LOG_EVENTS.OPERATIONAL_ERROR,
      component: "GlobalErrorHandler",
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: {
        message,
      },
    });
  } else {
    // Branch 6: Unexpected Internal Server Exceptions
    const unknownError =
      err instanceof Error
        ? err
        : new Error(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);

    message = unknownError.message;

    logger.error({
      event: LOG_EVENTS.UNHANDLED_EXCEPTION,
      component: "GlobalErrorHandler",
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: {
        name: unknownError.name,
        message: unknownError.message,
        stack: unknownError.stack,
      },
    });
  }

  // Development Response: Include stack traces for debugging
  if (process.env.NODE_ENV === "development") {
    return apiResponse({
      req,
      res,
      statusCode,
      success: false,
      message,
      errors:
        errors.length > 0
          ? errors
          : err instanceof Error
            ? err.stack
            : undefined,
    });
  }

  // Production Response: Sanitize error output and exclude stack traces
  return apiResponse({
    req,
    res,
    statusCode,
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
  });
};
