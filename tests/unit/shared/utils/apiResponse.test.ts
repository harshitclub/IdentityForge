import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { apiResponse } from "../../../../src/shared/utils/apiResponse.js";

describe("apiResponse", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      method: "GET",
      originalUrl: "/api/v1/users/me",
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it("should return a successful response with default values", () => {
    apiResponse({
      req: req as Request,
      res: res as Response,
    });

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Success",
      meta: {
        timestamp: expect.any(String),
        method: "GET",
        path: "/api/v1/users/me",
      },
    });
  });

  it("should include data when provided", () => {
    const data = {
      id: "123",
      email: "harshit@example.com",
    };

    apiResponse({
      req: req as Request,
      res: res as Response,
      data,
    });

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
      }),
    );
  });

  it("should include errors when provided", () => {
    const errors = {
      email: "Email already exists",
    };

    apiResponse({
      req: req as Request,
      res: res as Response,
      errors,
    });

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors,
      }),
    );
  });

  it("should include cached flag when provided", () => {
    apiResponse({
      req: req as Request,
      res: res as Response,
      cached: true,
    });

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          cached: true,
        }),
      }),
    );
  });

  it("should use custom status code, success and message", () => {
    apiResponse({
      req: req as Request,
      res: res as Response,
      statusCode: 201,
      success: false,
      message: "Custom Message",
    });

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Custom Message",
      }),
    );
  });

  it("should not include data when it is undefined", () => {
    apiResponse({
      req: req as Request,
      res: res as Response,
    });

    const response = vi.mocked(res.json).mock.calls[0][0];

    expect(response).not.toHaveProperty("data");
  });

  it("should not include errors when they are not provided", () => {
    apiResponse({
      req: req as Request,
      res: res as Response,
    });

    const response = vi.mocked(res.json).mock.calls[0][0];

    expect(response).not.toHaveProperty("errors");
  });

  it("should not include cached when it is undefined", () => {
    apiResponse({
      req: req as Request,
      res: res as Response,
    });

    const response = vi.mocked(res.json).mock.calls[0][0];

    expect(response.meta).not.toHaveProperty("cached");
  });
});
