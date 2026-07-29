import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("../../../../src/shared/logging/logger.js", () => ({
  logger: {
    info: vi.fn(),
  },
}));

import { logger } from "../../../../src/shared/logging/logger.js";
import { requestLoggerMiddleware } from "../../../../src/shared/middlewares/request-logger.middleware.js";
import { LOG_EVENTS } from "../../../../src/constants/index.js";

describe("requestLoggerMiddleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      requestId: "request-id-123",
      method: "GET",
      originalUrl: "/api/v1/users/me",
      ip: "127.0.0.1",
      protocol: "http",
      get: vi.fn().mockReturnValue("Vitest"),
    };

    res = {
      statusCode: 200,
      on: vi.fn(),
    };

    next = vi.fn();

    vi.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1050);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("should log request started", () => {
    requestLoggerMiddleware(req as Request, res as Response, next);

    expect(logger.info).toHaveBeenCalledWith({
      event: LOG_EVENTS.REQUEST_STARTED,
      requestId: "request-id-123",
      method: "GET",
      url: "/api/v1/users/me",
      ip: "127.0.0.1",
      protocol: "http",
      userAgent: "Vitest",
    });
  });

  it("should register finish event", () => {
    requestLoggerMiddleware(req as Request, res as Response, next);

    expect(res.on).toHaveBeenCalledTimes(1);
    expect(res.on).toHaveBeenCalledWith("finish", expect.any(Function));
  });

  it("should log request completed when response finishes", () => {
    requestLoggerMiddleware(req as Request, res as Response, next);

    const finishCallback = vi.mocked(res.on).mock.calls[0]![1] as () => void;

    finishCallback();

    expect(logger.info).toHaveBeenLastCalledWith({
      event: LOG_EVENTS.REQUEST_COMPLETED,
      requestId: "request-id-123",
      method: "GET",
      url: "/api/v1/users/me",
      statusCode: 200,
      durationMs: 50,
      ip: "127.0.0.1",
      protocol: "http",
      userAgent: "Vitest",
    });
  });

  it("should call next", () => {
    requestLoggerMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
