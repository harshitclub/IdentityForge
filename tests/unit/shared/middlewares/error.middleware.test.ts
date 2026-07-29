import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import jwt from "jsonwebtoken";
import { ZodError } from "zod";

vi.mock("../../../../src/shared/request-context/request-context.ts", () => ({
  getRequestLogger: vi.fn(),
}));

vi.mock("../../../../src/shared/utils/apiResponse.ts", () => ({
  apiResponse: vi.fn(),
}));

import { globalErrorHandler } from "../../../../src/shared/middlewares/error.middleware.js";
import { getRequestLogger } from "../../../../src/shared/request-context/request-context.js";
import { apiResponse } from "../../../../src/shared/utils/apiResponse.js";
import { AppError } from "../../../../src/shared/utils/appError.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../../../src/constants/index.js";

describe("globalErrorHandler", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const logger = {
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    req = {
      method: "POST",
      originalUrl: "/api/v1/auth/login",
    };

    res = {};

    next = vi.fn();

    vi.mocked(getRequestLogger).mockReturnValue(logger as any);

    vi.mocked(apiResponse).mockReturnValue(undefined as any);

    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle AppError", () => {
    const error = new AppError("User not found", HTTP_STATUS.NOT_FOUND);

    globalErrorHandler(error, req as Request, res as Response, next);

    expect(logger.warn).toHaveBeenCalled();

    expect(apiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.NOT_FOUND,
        success: false,
        message: "User not found",
      }),
    );
  });

  it("should handle ZodError", () => {
    const error = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["email"],
        message: "Expected string",
      } as any,
    ]);

    globalErrorHandler(error, req as Request, res as Response, next);

    expect(logger.warn).toHaveBeenCalled();

    expect(apiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        success: false,
        message: "Validation Failed",
      }),
    );
  });

  it("should handle JsonWebTokenError", () => {
    const error = new jwt.JsonWebTokenError("Invalid Token");

    globalErrorHandler(error, req as Request, res as Response, next);

    expect(logger.warn).toHaveBeenCalled();

    expect(apiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: ERROR_MESSAGES.INVALID_TOKEN,
      }),
    );
  });

  it("should handle TokenExpiredError", () => {
    const error = new jwt.TokenExpiredError("Expired", new Date());

    globalErrorHandler(error, req as Request, res as Response, next);

    expect(logger.warn).toHaveBeenCalled();

    expect(apiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: ERROR_MESSAGES.TOKEN_EXPIRED,
      }),
    );
  });

  it("should handle unknown Error", () => {
    const error = new Error("Unexpected Error");

    globalErrorHandler(error, req as Request, res as Response, next);

    expect(logger.error).toHaveBeenCalled();

    expect(apiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: "Unexpected Error",
      }),
    );
  });

  it("should include stack trace in development mode", () => {
    process.env.NODE_ENV = "development";

    const error = new Error("Development Error");

    globalErrorHandler(error, req as Request, res as Response, next);

    expect(apiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.any(String),
      }),
    );
  });
});
