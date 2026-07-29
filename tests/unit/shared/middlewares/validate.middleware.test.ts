import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import type { ZodObject } from "zod";
import { validate } from "../../../../src/shared/middlewares/validate.middleware.js";

describe("validate middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {
        email: "harshit@example.com",
        password: "password123",
      },
    };

    res = {};

    next = vi.fn();
  });

  it("should call next when validation succeeds", async () => {
    const schema = {
      parseAsync: vi.fn().mockResolvedValue(req.body),
    } as unknown as ZodObject;

    const middleware = validate(schema);

    await middleware(req as Request, res as Response, next);

    expect(schema.parseAsync).toHaveBeenCalledTimes(1);
    expect(schema.parseAsync).toHaveBeenCalledWith(req.body);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("should call next with error when validation fails", async () => {
    const error = new Error("Validation failed");

    const schema = {
      parseAsync: vi.fn().mockRejectedValue(error),
    } as unknown as ZodObject;

    const middleware = validate(schema);

    await middleware(req as Request, res as Response, next);

    expect(schema.parseAsync).toHaveBeenCalledTimes(1);
    expect(schema.parseAsync).toHaveBeenCalledWith(req.body);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });
});
