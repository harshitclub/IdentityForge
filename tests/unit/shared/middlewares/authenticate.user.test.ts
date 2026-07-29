import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("../../../../src/shared/utils/auth/accessToken.js", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("../../../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { authenticateUser } from "../../../../src/shared/middlewares/authenticate.user.js";
import { verifyAccessToken } from "../../../../src/shared/utils/auth/accessToken.js";
import { prisma } from "../../../../src/config/prisma.js";
import { AppError } from "../../../../src/shared/utils/appError.js";
import { ERROR_MESSAGES } from "../../../../src/constants/index.js";

describe("authenticateUser", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      cookies: {
        if_accessToken: "access-token",
      },
    };

    res = {};

    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should authenticate a valid user", async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      id: "user-123",
      email: "harshit@example.com",
      role: "USER",
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-123",
      role: "USER",
      status: "ACTIVE",
      lockUntil: null,
    } as any);

    await authenticateUser(req as Request, res as Response, next);

    expect(req.user).toEqual({
      id: "user-123",
    });

    expect(next).toHaveBeenCalledOnce();
  });

  it("should throw when access token is missing", async () => {
    req.cookies = {};

    await expect(
      authenticateUser(req as Request, res as Response, next),
    ).rejects.toThrow(AppError);
  });

  it("should throw when user does not exist", async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      id: "user-123",
      email: "harshit@example.com",
      role: "USER",
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      authenticateUser(req as Request, res as Response, next),
    ).rejects.toThrow(ERROR_MESSAGES.ACCESS_TOKEN_INVALID);
  });

  it("should throw when account is deleted", async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      id: "user-123",
      email: "harshit@example.com",
      role: "USER",
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-123",
      role: "USER",
      status: "DELETED",
      lockUntil: null,
    } as any);

    await expect(
      authenticateUser(req as Request, res as Response, next),
    ).rejects.toThrow(ERROR_MESSAGES.ACCOUNT_DELETED);
  });

  it("should throw when account is locked", async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      id: "user-123",
      email: "harshit@example.com",
      role: "USER",
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-123",
      role: "USER",
      status: "ACTIVE",
      lockUntil: new Date(Date.now() + 60_000),
    } as any);

    await expect(
      authenticateUser(req as Request, res as Response, next),
    ).rejects.toThrow(ERROR_MESSAGES.ACCOUNT_LOCKED);
  });

  it("should stop when verifyAccessToken throws", async () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw new AppError("Invalid Token", 401);
    });

    await expect(
      authenticateUser(req as Request, res as Response, next),
    ).rejects.toThrow(AppError);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
