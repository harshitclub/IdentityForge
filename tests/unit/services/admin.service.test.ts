import { beforeEach, describe, expect, it, vi, vitest } from "vitest";
import { cacheRedis } from "../../../src/config/redis";
import { prisma } from "../../../src/config/prisma";
import { adminService } from "../../../src/modules/admin/admin.service";
import { AppError } from "../../../src/shared/utils/appError";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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
    keys: vi.fn(),
  },
}));

const paginationData = {
  page: 1,
  limit: 10,
};

const users = [
  {
    id: "user-1",
    firstName: "Harshit",
    lastName: "Kumar",
    email: "harshit@example.com",
    role: "USER",
    status: "ACTIVE",
    isEmailVerified: true,
  },
  {
    id: "user-2",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    role: "ADMIN",
    status: "ACTIVE",
    isEmailVerified: true,
  },
];

const response = {
  users,
  pagination: {
    page: 1,
    limit: 10,
    totalUsers: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};
const user = {
  id: "user-1",
  firstName: "Harshit",
  lastName: "Kumar",
  email: "harshit@example.com",
  role: "USER",
  status: "ACTIVE",
  isEmailVerified: true,
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
    callback(tx),
  );
});

describe("AdminService", () => {
  describe("getAllUsers()", () => {
    it("should return cached users", async () => {
      vitest.mocked(cacheRedis.get).mockResolvedValue(JSON.stringify(response));

      const result = await adminService.getAllUsers(paginationData);

      expect(result.cached).toBe(true);

      expect(result.data).toEqual(response);

      expect(prisma.$transaction).not.toHaveBeenCalled();

      expect(cacheRedis.set).not.toHaveBeenCalled();
    });

    it("should fetch users from database on cache miss", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.$transaction).mockResolvedValue([users, 2] as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      const result = await adminService.getAllUsers(paginationData);

      expect(result.cached).toBe(false);

      expect(result.data).toEqual(response);
    });

    it("should query users with pagination", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.$transaction).mockResolvedValue([users, 2] as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      await adminService.getAllUsers(paginationData);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(prisma.user.count).toHaveBeenCalled();
    });

    it("should cache users after database lookup", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.$transaction).mockResolvedValue([users, 2] as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      await adminService.getAllUsers(paginationData);

      expect(cacheRedis.set).toHaveBeenCalledWith(
        "admin:users:1:10",
        JSON.stringify(response),
        "EX",
        60 * 5,
      );
    });

    it("should return users fetched from database", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.$transaction).mockResolvedValue([users, 2] as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      const result = await adminService.getAllUsers(paginationData);

      expect(result).toEqual({
        data: response,
        cached: false,
      });
    });
  });

  describe("getUserById()", () => {
    it("should return cached user", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(JSON.stringify(user));

      const result = await adminService.getUserById("user-1");

      expect(result.cached).toBe(true);

      expect(result.user).toEqual(user);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();

      expect(cacheRedis.set).not.toHaveBeenCalled();
    });

    it("should throw if user does not exist", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(adminService.getUserById("user-1")).rejects.toBeInstanceOf(
        AppError,
      );

      expect(cacheRedis.set).not.toHaveBeenCalled();
    });

    it("should fetch user from database on cache miss", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      const result = await adminService.getUserById("user-1");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(result.cached).toBe(false);

      expect(result.user).toEqual(user);
    });

    it("should cache user after database lookup", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      await adminService.getUserById("user-1");

      expect(cacheRedis.set).toHaveBeenCalledWith(
        "admin:user:user-1",
        JSON.stringify(user),
        "EX",
        60 * 5,
      );
    });

    it("should return user fetched from database", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      const result = await adminService.getUserById("user-1");

      expect(result).toEqual({
        user,
        cached: false,
      });
    });
  });

  describe("updateUserRole()", () => {
    const updateRoleData = {
      role: "ADMIN",
    };

    const updatedUser = {
      id: "user-1",
      firstName: "Harshit",
      lastName: "Kumar",
      email: "harshit@example.com",
      role: "ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
      updatedAt: new Date(),
    };

    it("should throw if user does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        adminService.updateUserRole("user-1", updateRoleData),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.user.update).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should throw if role is already assigned", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        role: "ADMIN",
      } as any);

      await expect(
        adminService.updateUserRole("user-1", updateRoleData),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.user.update).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should update user role successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        role: "USER",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      const result = await adminService.updateUserRole(
        "user-1",
        updateRoleData,
      );

      expect(result).toEqual(updatedUser);
    });

    it("should update user role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        role: "USER",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      await adminService.updateUserRole("user-1", updateRoleData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },
        data: {
          role: "ADMIN",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          isEmailVerified: true,
          updatedAt: true,
        },
      });
    });

    it("should invalidate cached user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        role: "USER",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      await adminService.updateUserRole("user-1", updateRoleData);

      expect(cacheRedis.del).toHaveBeenCalledWith("admin:user:user-1");
    });

    it("should invalidate admin users cache", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        role: "USER",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.keys).mockResolvedValue([
        "admin:users:1:10",
        "admin:users:2:10",
      ]);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await adminService.updateUserRole("user-1", updateRoleData);

      expect(cacheRedis.keys).toHaveBeenCalledWith("admin:users:*");

      expect(cacheRedis.del).toHaveBeenNthCalledWith(
        2,
        "admin:users:1:10",
        "admin:users:2:10",
      );
    });

    it("should return updated user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        role: "USER",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      const result = await adminService.updateUserRole(
        "user-1",
        updateRoleData,
      );

      expect(result).toEqual(updatedUser);
    });
  });

  describe("updateUserStatus()", () => {
    const updateStatusData = {
      status: "SUSPENDED",
    };

    const updatedUser = {
      id: "user-1",
      firstName: "Harshit",
      lastName: "Kumar",
      email: "harshit@example.com",
      role: "USER",
      status: "SUSPENDED",
      isEmailVerified: true,
      updatedAt: new Date(),
    };

    it("should throw if user does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        adminService.updateUserStatus("user-1", updateStatusData),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.user.update).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should throw if status is already assigned", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "SUSPENDED",
      } as any);

      await expect(
        adminService.updateUserStatus("user-1", updateStatusData),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.user.update).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should update user status successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      const result = await adminService.updateUserStatus(
        "user-1",
        updateStatusData,
      );

      expect(result).toEqual(updatedUser);
    });

    it("should update user status", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      await adminService.updateUserStatus("user-1", updateStatusData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },
        data: {
          status: "SUSPENDED",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          isEmailVerified: true,
          updatedAt: true,
        },
      });
    });

    it("should invalidate cached user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      await adminService.updateUserStatus("user-1", updateStatusData);

      expect(cacheRedis.del).toHaveBeenCalledWith("admin:user:user-1");
    });

    it("should invalidate admin users cache", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.keys).mockResolvedValue([
        "admin:users:1:10",
        "admin:users:2:10",
      ]);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await adminService.updateUserStatus("user-1", updateStatusData);

      expect(cacheRedis.keys).toHaveBeenCalledWith("admin:users:*");

      expect(cacheRedis.del).toHaveBeenNthCalledWith(
        2,
        "admin:users:1:10",
        "admin:users:2:10",
      );
    });

    it("should return updated user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      const result = await adminService.updateUserStatus(
        "user-1",
        updateStatusData,
      );

      expect(result).toEqual(updatedUser);
    });
  });

  describe("deleteUser()", () => {
    it("should throw if user does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(adminService.deleteUser("user-1")).rejects.toBeInstanceOf(
        AppError,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should throw if user is already deleted", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "DELETED",
      } as any);

      await expect(adminService.deleteUser("user-1")).rejects.toBeInstanceOf(
        AppError,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();

      expect(cacheRedis.del).not.toHaveBeenCalled();
    });

    it("should delete user successfully and purge sessions/tokens", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "ACTIVE",
      } as any);

      tx.user.update.mockResolvedValue({} as any);
      tx.refreshToken.deleteMany.mockResolvedValue({ count: 1 } as any);
      tx.session.deleteMany.mockResolvedValue({ count: 1 } as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);
      vi.mocked(cacheRedis.keys).mockResolvedValue([]);

      await expect(adminService.deleteUser("user-1")).resolves.toBeUndefined();

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tx.user.update).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },
        data: {
          status: "DELETED",
          deletedAt: expect.any(Date),
        },
      });
      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
      expect(tx.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should invalidate cached user and admin users cache", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        status: "ACTIVE",
      } as any);

      tx.user.update.mockResolvedValue({} as any);
      tx.refreshToken.deleteMany.mockResolvedValue({ count: 1 } as any);
      tx.session.deleteMany.mockResolvedValue({ count: 1 } as any);

      vi.mocked(cacheRedis.keys).mockResolvedValue([
        "admin:users:1:10",
        "admin:users:2:10",
      ]);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await adminService.deleteUser("user-1");

      expect(cacheRedis.del).toHaveBeenCalledWith("user:user-1");
      expect(cacheRedis.del).toHaveBeenCalledWith("admin:user:user-1");
      expect(cacheRedis.keys).toHaveBeenCalledWith("admin:users:*");
      expect(cacheRedis.del).toHaveBeenCalledWith(
        "admin:users:1:10",
        "admin:users:2:10",
      );
    });
  });
});
