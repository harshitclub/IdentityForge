import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("node:crypto", () => ({
  randomUUID: vi.fn(),
}));

import { randomUUID } from "node:crypto";
import { requestIdMiddleware } from "../../../../src/shared/middlewares/request-id.middleware.js";

describe("requestIdMiddleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};

    res = {
      setHeader: vi.fn(),
    };

    next = vi.fn();

    vi.mocked(randomUUID).mockReturnValue("request-id-123");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should generate and attach a request id", () => {
    requestIdMiddleware(req as Request, res as Response, next);

    expect(randomUUID).toHaveBeenCalledOnce();

    expect(req.requestId).toBe("request-id-123");

    expect(res.setHeader).toHaveBeenCalledWith(
      "X-Request-ID",
      "request-id-123",
    );
  });

  it("should call next", () => {
    requestIdMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
