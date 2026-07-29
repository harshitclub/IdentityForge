import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("../../../../src/config/prisma.ts", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../../../../src/config/prisma";
import { authenticateAdmin } from "../../../../src/shared/middlewares/authenticate.admin";
import { AppError } from "../../../../src/shared/utils/appError";
import { ERROR_MESSAGES } from "../../../../src/constants";

describe("authenticateAdmin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: {
        id: "user-123",
      },
    };

    res = {};

    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should authenticate an admin user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "ADMIN",
    } as any);

    await authenticateAdmin(req as Request, res as Response, next);

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        id: "user-123",
      },
      select: {
        role: true,
      },
    });

    expect(next).toHaveBeenCalledOnce();
  });

  it("should throw when user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      authenticateAdmin(req as Request, res as Response, next),
    ).rejects.toThrow(AppError);

    expect(next).not.toHaveBeenCalled();
  });

  it("should throw when user is not an admin", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "USER",
    } as any);

    await expect(
      authenticateAdmin(req as Request, res as Response, next),
    ).rejects.toThrow(ERROR_MESSAGES.FORBIDDEN);

    expect(next).not.toHaveBeenCalled();
  });
});
