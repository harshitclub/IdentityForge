import { prisma } from "../../config/prisma.js";
import { cacheRedis } from "../../config/redis.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../constants/index.js";
import { getRequestLogger } from "../../shared/request-context/request-context.js";
import { AppError } from "../../shared/utils/appError.js";
import type {
  PaginationDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from "./admin.types.js";

class AdminService {
  async getAllUsers(data: PaginationDto) {
    const logger = getRequestLogger();

    const { page, limit } = data;

    logger.info({
      event: LOG_EVENTS.ADMIN_USERS_FETCH_STARTED,
      page,
      limit,
    });

    const skip = (page - 1) * limit;

    const cacheKey = `admin:users:${page}:${limit}`;

    const cachedUsers = await cacheRedis.get(cacheKey);

    if (cachedUsers) {
      logger.info({
        event: LOG_EVENTS.CACHE_HIT,
        cacheKey,
      });
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

    logger.info({
      event: LOG_EVENTS.CACHE_MISS,
      cacheKey,
    });

    await cacheRedis.set(cacheKey, JSON.stringify(response), "EX", 60 * 5);
    logger.info({
      event: LOG_EVENTS.ADMIN_USERS_FETCH_COMPLETED,
      page,
      limit,
      totalUsers,
    });
    return {
      data: response,
      cached: false,
    };
  }

  async getUserById(userId: string) {
    const logger = getRequestLogger();
    const cacheKey = `admin:user:${userId}`;

    const cachedUser = await cacheRedis.get(cacheKey);

    if (cachedUser) {
      logger.info({
        event: LOG_EVENTS.CACHE_HIT,
        cacheKey,
      });
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
      logger.warn({
        event: LOG_EVENTS.USER_NOT_FOUND,
        userId,
      });
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    logger.info({
      event: LOG_EVENTS.CACHE_MISS,
      cacheKey,
    });
    await cacheRedis.set(cacheKey, JSON.stringify(user), "EX", 60 * 5);
    logger.info({
      event: LOG_EVENTS.ADMIN_USER_FETCHED,
      userId,
    });
    return {
      user,
      cached: false,
    };
  }

  async updateUserRole(userId: string, data: UpdateUserRoleDto) {
    const logger = getRequestLogger();

    const { role } = data;

    logger.info({
      event: LOG_EVENTS.USER_ROLE_UPDATE_STARTED,
      targetUserId: userId,
      newRole: role,
    });

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
      logger.warn({
        event: LOG_EVENTS.USER_NOT_FOUND,
        targetUserId: userId,
      });
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.role === role) {
      logger.warn({
        event: LOG_EVENTS.USER_ROLE_ALREADY_ASSIGNED,
        targetUserId: userId,
        role,
      });
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

    logger.info({
      event: LOG_EVENTS.USER_ROLE_UPDATED,
      targetUserId: userId,
      role,
    });
    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");

    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }

    return updatedUser;
  }

  async updateUserStatus(userId: string, data: UpdateUserStatusDto) {
    const logger = getRequestLogger();
    const { status } = data;
    logger.info({
      event: LOG_EVENTS.USER_STATUS_UPDATE_STARTED,
      targetUserId: userId,
      newStatus: status,
    });

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
      logger.warn({
        event: LOG_EVENTS.USER_NOT_FOUND,
        targetUserId: userId,
      });
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.status === status) {
      logger.warn({
        event: LOG_EVENTS.USER_STATUS_ALREADY_ASSIGNED,
        targetUserId: userId,
        status,
      });
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

    logger.info({
      event: LOG_EVENTS.USER_STATUS_UPDATED,
      targetUserId: userId,
      status,
    });
    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");

    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }

    return updatedUser;
  }

  async deleteUser(userId: string) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.USER_DELETION_STARTED,
      targetUserId: userId,
    });
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
      logger.warn({
        event: LOG_EVENTS.USER_NOT_FOUND,
        targetUserId: userId,
      });
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.status === "DELETED") {
      logger.warn({
        event: LOG_EVENTS.USER_ALREADY_DELETED,
        targetUserId: userId,
      });
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

    logger.info({
      event: LOG_EVENTS.USER_DELETED,
      targetUserId: userId,
    });
    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");

    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }
  }
}

export const adminService = new AdminService();
