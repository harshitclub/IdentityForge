import { prisma } from "../../config/prisma.js";
import { cacheRedis } from "../../config/redis.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../constants/index.js";
import { AppError } from "../../shared/utils/appError.js";
import type {
  PaginationDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from "./admin.types.js";

class AdminService {
  async getAllUsers(data: PaginationDto) {
    const { page, limit } = data;

    const skip = (page - 1) * limit;

    const cacheKey = `admin:users:${page}:${limit}`;

    const cachedUsers = await cacheRedis.get(cacheKey);

    if (cachedUsers) {
      return {
        data: JSON.parse(cachedUsers),
        cached: true,
      };
    }

    const [users, totalUsers] = await prisma.$transaction([
      prisma.user.findMany({
        skip,
        take: limit,
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
      }),

      prisma.user.count(),
    ]);

    const response = {
      users,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        hasNextPage: page * limit < totalUsers,
        hasPreviousPage: page > 1,
      },
    };

    await cacheRedis.set(cacheKey, JSON.stringify(response), "EX", 60 * 5);

    return {
      data: response,
      cached: false,
    };
  }

  async getUserById(userId: string) {
    const cacheKey = `admin:user:${userId}`;

    const cachedUser = await cacheRedis.get(cacheKey);

    if (cachedUser) {
      return {
        user: JSON.parse(cachedUser),
        cached: true,
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
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

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    await cacheRedis.set(cacheKey, JSON.stringify(user), "EX", 60 * 5);

    return {
      user,
      cached: false,
    };
  }

  async updateUserRole(userId: string, data: UpdateUserRoleDto) {
    const { role } = data;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.role === role) {
      throw new AppError(
        ERROR_MESSAGES.USER_ROLE_ALREADY_ASSIGNED,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role,
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

    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");

    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }

    return updatedUser;
  }

  async updateUserStatus(userId: string, data: UpdateUserStatusDto) {
    const { status } = data;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.status === status) {
      throw new AppError(
        ERROR_MESSAGES.USER_STATUS_ALREADY_ASSIGNED,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status,
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

    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");

    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }

    return updatedUser;
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.status === "DELETED") {
      throw new AppError(
        ERROR_MESSAGES.USER_ALREADY_DELETED,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: "DELETED",
      },
    });

    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");

    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }
  }
}

export const adminService = new AdminService();
