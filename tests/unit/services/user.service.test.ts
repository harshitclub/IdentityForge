import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/shared/utils/appError";
import { cacheRedis } from "../../../src/config/redis";
import { prisma } from "../../../src/config/prisma";
import { userService } from "../../../src/modules/user/user.service";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },

    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },

    session: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },

    emailVerificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },

    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },

    $transaction: vi.fn(),
  },
}));

const tx = {
  user: {
    create: vi.fn(),
    update: vi.fn(),
  },

  emailVerificationToken: {
    create: vi.fn(),
    delete: vi.fn(),
  },

  session: {
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },

  refreshToken: {
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  passwordResetToken: {
    update: vi.fn(),
  },
};

vi.mock("../../../src/config/redis.js", () => ({
  cacheRedis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
  },
}));

const updateProfileData = {
  firstName: "Harshit",
  lastName: "Kumar",
  username: "harshit",
};

const updatedUser = {
  id: "user-1",
  firstName: "Harshit",
  lastName: "Kumar",
  username: "harshit",
  email: "harshit@example.com",
  avatarUrl: null,
  role: "USER",
  status: "ACTIVE",
  isEmailVerified: true,
  updatedAt: new Date(),
};

const sessions = [
  {
    id: "session-1",
    ipAddress: "127.0.0.1",
    browser: "Chrome",
    os: "Windows",
    device: "Desktop",
    country: "India",
    city: "Delhi",
    isCurrent: true,
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    createdAt: new Date(),
  },
  {
    id: "session-2",
    ipAddress: "192.168.1.1",
    browser: "Firefox",
    os: "Linux",
    device: "Laptop",
    country: "India",
    city: "Mumbai",
    isCurrent: false,
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    createdAt: new Date(),
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
    callback(tx),
  );
});

describe("UserService", () => {
  describe("updateProfile()", () => {
    it("should throw if username is already taken", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "another-user",
      } as any);

      await expect(
        userService.updateProfile("user-1", updateProfileData),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.user.update).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should update profile successfully", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      const result = await userService.updateProfile(
        "user-1",
        updateProfileData,
      );

      expect(result).toEqual(updatedUser);
    });

    it("should check username uniqueness", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await userService.updateProfile("user-1", updateProfileData);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: "harshit",
          NOT: {
            id: "user-1",
          },
        },
      });
    });

    it("should update user profile", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await userService.updateProfile("user-1", updateProfileData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },
        data: updateProfileData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true,
          status: true,
          isEmailVerified: true,
          updatedAt: true,
        },
      });
    });

    it("should invalidate cached user profile", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await userService.updateProfile("user-1", updateProfileData);

      expect(cacheRedis.del).toHaveBeenCalledWith("user:user-1");
    });

    it("should return updated user", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      const result = await userService.updateProfile(
        "user-1",
        updateProfileData,
      );

      expect(result).toEqual(updatedUser);
    });

    it("should update only provided fields", async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);
      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await userService.updateProfile("user-1", {
        firstName: "Harshit",
      });

      expect(prisma.user.findFirst).not.toHaveBeenCalled();

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            firstName: "Harshit",
          },
        }),
      );
    });
  });

  describe("deleteAccount()", () => {
    it("should throw if user does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(userService.deleteAccount("user-1")).rejects.toBeInstanceOf(
        AppError,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should throw if account is already deleted", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        deletedAt: new Date(),
      } as any);

      await expect(userService.deleteAccount("user-1")).rejects.toBeInstanceOf(
        AppError,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should delete account successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        deletedAt: null,
      } as any);

      tx.user.update.mockResolvedValue({} as any);
      tx.refreshToken.deleteMany.mockResolvedValue({} as any);
      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await expect(
        userService.deleteAccount("user-1"),
      ).resolves.toBeUndefined();
    });

    it("should soft delete user account", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        deletedAt: null,
      } as any);

      tx.user.update.mockResolvedValue({} as any);
      tx.refreshToken.deleteMany.mockResolvedValue({} as any);
      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await userService.deleteAccount("user-1");

      expect(tx.user.update).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },
        data: {
          deletedAt: expect.any(Date),
          status: "DELETED",
        },
      });
    });

    it("should delete all refresh tokens", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        deletedAt: null,
      } as any);

      tx.user.update.mockResolvedValue({} as any);
      tx.refreshToken.deleteMany.mockResolvedValue({} as any);
      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await userService.deleteAccount("user-1");

      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should delete all sessions", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        deletedAt: null,
      } as any);

      tx.user.update.mockResolvedValue({} as any);
      tx.refreshToken.deleteMany.mockResolvedValue({} as any);
      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await userService.deleteAccount("user-1");

      expect(tx.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should invalidate cached user profile", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        deletedAt: null,
      } as any);

      tx.user.update.mockResolvedValue({} as any);
      tx.refreshToken.deleteMany.mockResolvedValue({} as any);
      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await userService.deleteAccount("user-1");

      expect(cacheRedis.del).toHaveBeenCalledWith("user:user-1");
    });
  });

  describe("getSessions()", () => {
    it("should fetch all active sessions successfully", async () => {
      vi.mocked(prisma.session.findMany).mockResolvedValue(sessions as any);

      const result = await userService.getSessions("user-1");

      expect(result).toEqual(sessions);
    });

    it("should query active sessions only", async () => {
      vi.mocked(prisma.session.findMany).mockResolvedValue(sessions as any);

      await userService.getSessions("user-1");

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        select: {
          id: true,
          ipAddress: true,
          browser: true,
          os: true,
          device: true,
          country: true,
          city: true,
          isCurrent: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: {
          lastUsedAt: "desc",
        },
      });
    });

    it("should return all active sessions", async () => {
      vi.mocked(prisma.session.findMany).mockResolvedValue(sessions as any);

      const result = await userService.getSessions("user-1");

      expect(result).toEqual(sessions);

      expect(result).toHaveLength(2);
    });
  });

  describe("revokeSession()", () => {
    it("should throw if session does not exist", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      await expect(
        userService.revokeSession("user-1", "session-1"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.session.delete).not.toHaveBeenCalled();
    });

    it("should throw if session belongs to another user", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-1",
        userId: "another-user",
        isCurrent: false,
      } as any);

      await expect(
        userService.revokeSession("user-1", "session-1"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.session.delete).not.toHaveBeenCalled();
    });

    it("should throw if trying to revoke current session", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        isCurrent: true,
      } as any);

      await expect(
        userService.revokeSession("user-1", "session-1"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.session.delete).not.toHaveBeenCalled();
    });

    it("should revoke session successfully", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        isCurrent: false,
      } as any);

      vi.mocked(prisma.session.delete).mockResolvedValue({} as any);

      await expect(
        userService.revokeSession("user-1", "session-1"),
      ).resolves.toBeUndefined();
    });

    it("should delete the session", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        isCurrent: false,
      } as any);

      vi.mocked(prisma.session.delete).mockResolvedValue({} as any);

      await userService.revokeSession("user-1", "session-1");

      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: {
          id: "session-1",
        },
      });
    });
  });
});
