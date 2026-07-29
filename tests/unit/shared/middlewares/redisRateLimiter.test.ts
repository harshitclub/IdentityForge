import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("../../../../src/config/redis.js", () => ({
  cacheRedis: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  },
}));

vi.mock("../../../..//src/shared/logging/logger.js", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

vi.mock("../../../../src/shared/utils/apiResponse.js", () => ({
  apiResponse: vi.fn(),
}));

vi.mock("../../../../src/config/env.js", () => ({
  env: {
    RATE_LIMIT_WINDOW_SECONDS: 60,
    RATE_LIMIT_MAX_REQUESTS: 5,
  },
}));

import { rateLimiter } from "../../../../src/shared/middlewares/redisRateLimiter.js";
import { cacheRedis } from "../../../../src/config/redis.js";
import { logger } from "../../../../src/shared/logging/logger.js";
import { apiResponse } from "../../../../src/shared/utils/apiResponse.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../../../src/constants/index.js";

describe("rateLimiter", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      ip: "127.0.0.1",
      requestId: "request-123",
      method: "GET",
      originalUrl: "/api/test",
      protocol: "http",
      get: vi.fn().mockReturnValue("Vitest"),
    };

    res = {
      setHeader: vi.fn(),
    };

    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should allow request under the limit", async () => {
    vi.mocked(cacheRedis.incr).mockResolvedValue(2);
    vi.mocked(cacheRedis.ttl).mockResolvedValue(45);

    await rateLimiter(req as Request, res as Response, next);

    expect(cacheRedis.expire).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledOnce();
  });

  it("should set expiry on first request", async () => {
    vi.mocked(cacheRedis.incr).mockResolvedValue(1);
    vi.mocked(cacheRedis.expire).mockResolvedValue(1);
    vi.mocked(cacheRedis.ttl).mockResolvedValue(60);

    await rateLimiter(req as Request, res as Response, next);

    expect(cacheRedis.expire).toHaveBeenCalledWith("ratelimit:127.0.0.1", 60);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should return 429 when limit is exceeded", async () => {
    vi.mocked(cacheRedis.incr).mockResolvedValue(6);
    vi.mocked(cacheRedis.ttl).mockResolvedValue(30);

    await rateLimiter(req as Request, res as Response, next);

    expect(logger.warn).toHaveBeenCalled();

    expect(apiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
      }),
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("should forward redis errors", async () => {
    const error = new Error("Redis Error");

    vi.mocked(cacheRedis.incr).mockRejectedValue(error);

    await rateLimiter(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
