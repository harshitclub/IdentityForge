import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../../../src/shared/utils/asyncHandler.js";

describe("asyncHandler", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {} as Response;
    next = vi.fn() as NextFunction;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should execute the wrapped handler", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    const wrappedHandler = asyncHandler(handler);

    wrappedHandler(req, res, next);

    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it("should call next when the handler throws an error", async () => {
    const error = new Error("Something went wrong");

    const handler = vi.fn().mockRejectedValue(error);

    const wrappedHandler = asyncHandler(handler);

    wrappedHandler(req, res, next);

    await Promise.resolve();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  it("should not call next when the handler resolves successfully", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    const wrappedHandler = asyncHandler(handler);

    wrappedHandler(req, res, next);

    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
  });

  it("should preserve req, res and next arguments", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    const wrappedHandler = asyncHandler(handler);

    wrappedHandler(req, res, next);

    await Promise.resolve();

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });
});
