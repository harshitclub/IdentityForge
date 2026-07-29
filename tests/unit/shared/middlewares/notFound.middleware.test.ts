import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import { notFoundHandler } from "../../../../src/shared/middlewares/notFound.middleware.js";
import { AppError } from "../../../../src/shared/utils/appError.js";

describe("notFoundHandler", () => {
  it("should pass a 404 AppError to next", () => {
    const req = {
      method: "GET",
      originalUrl: "/api/v1/unknown",
    } as Request;

    const res = {} as Response;

    const next = vi.fn() as NextFunction;

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledOnce();

    const error = vi.mocked(next).mock.calls[0]![0];

    expect(error).toBeInstanceOf(AppError);

    expect(error.message).toBe("Cannot GET /api/v1/unknown");

    expect(error.statusCode).toBe(404);
  });
});
