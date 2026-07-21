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

  /**
   * Custom App Error
   */
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

  /**
   * Zod Validation Error
   */
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
  } else if (err instanceof jwt.JsonWebTokenError) {

  /**
   * JWT Invalid Error
   */
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
  } else if (err instanceof jwt.TokenExpiredError) {

  /**
   * JWT Expired Error
   */
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
  } else {

  /**
   * Unknown Errors
   */
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
      errors:
        errors.length > 0
          ? errors
          : err instanceof Error
            ? err.stack
            : undefined,
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
    ...(errors.length > 0 && { errors }),
  });
};
