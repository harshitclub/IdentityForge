import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("../../../../src/metrics/prometheus.js", () => ({
  httpRequestDurationSeconds: {
    observe: vi.fn(),
  },
  httpRequestsTotal: {
    inc: vi.fn(),
  },
}));

import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from "../../../../src/metrics/prometheus.js";
import { metricsMiddleware } from "../../../../src/shared/middlewares/metrics.middleware.js";

/**
 * ============================================================================
 * Metrics Middleware Unit Tests
 * ============================================================================
 */
describe("metricsMiddleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      method: "GET",
      originalUrl: "/api/v1/users/me",
      path: "/me",
      baseUrl: "/api/v1/users",
      route: { path: "/me" } as any,
    };

    res = {
      statusCode: 200,
      on: vi.fn(),
    };

    next = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("should skip metric collection for /system/metrics endpoint", () => {
    req.originalUrl = "/system/metrics";

    metricsMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.on).not.toHaveBeenCalled();
  });

  it("should register on finish listener and record metrics for standard routes", () => {
    metricsMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.on).toHaveBeenCalledWith("finish", expect.any(Function));

    const finishCallback = vi.mocked(res.on).mock.calls[0]![1] as () => void;
    finishCallback();

    expect(httpRequestDurationSeconds.observe).toHaveBeenCalledWith(
      {
        method: "GET",
        route: "/api/v1/users/me",
        status_code: "200",
      },
      expect.any(Number),
    );

    expect(httpRequestsTotal.inc).toHaveBeenCalledWith({
      method: "GET",
      route: "/api/v1/users/me",
      status_code: "200",
    });
  });

  it("should normalize dynamic IDs when req.route is undefined (unmatched/404)", () => {
    req = {
      method: "GET",
      originalUrl: "/api/v1/admin/users/clp1234567890123456789012?filter=active",
      path: "/api/v1/admin/users/clp1234567890123456789012",
      baseUrl: "",
      route: undefined,
    };

    res.statusCode = 404;

    metricsMiddleware(req as Request, res as Response, next);

    const finishCallback = vi.mocked(res.on).mock.calls[0]![1] as () => void;
    finishCallback();

    expect(httpRequestsTotal.inc).toHaveBeenCalledWith({
      method: "GET",
      route: "/api/v1/admin/users/:id",
      status_code: "404",
    });
  });
});
