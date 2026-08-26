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

/**
 * ============================================================================
 * AdminService
 * ============================================================================
 * Business logic for administrative user management, cached paginated queries,
 * role promotion/demotion, status updates, and atomic session-purging deletions.
 */
class AdminService {
  /**
   * --------------------------------------------------------------------------
   * 1. Get All Users (Paginated & Cached)
   * --------------------------------------------------------------------------
   * Retrieves a paginated list of users. Checks Redis cache first; on cache miss,
   * queries the database in parallel ($transaction) and caches results with a 5-minute TTL.
   *
   * @param data - Pagination parameters (page, limit)
   * @returns Paginated users payload with metadata and cache indicator
   */
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

    // Step 1: Check Redis cache
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

    // Step 2: Query database in parallel for page data and total count
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

    // Step 3: Populate Redis cache with 5-minute TTL
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

  /**
   * --------------------------------------------------------------------------
   * 2. Get User By ID (Cached)
   * --------------------------------------------------------------------------
   * Retrieves single user details for admin inspection. Uses Redis cache with 5-min TTL.
   *
   * @param userId - Target user ID
   * @returns User profile data and cache indicator
   */
  async getUserById(userId: string) {
    const logger = getRequestLogger();
    const cacheKey = `admin:user:${userId}`;

    // Step 1: Check Redis cache
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

    // Step 2: Query database
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

    // Step 3: Populate Redis cache
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

  /**
   * --------------------------------------------------------------------------
   * 3. Update User Role
   * --------------------------------------------------------------------------
   * Updates user role (USER / ADMIN), invalidates individual and listing Redis caches.
   *
   * @param userId - Target user ID
   * @param data - Role update payload
   * @returns Updated user profile
   */
  async updateUserRole(userId: string, data: UpdateUserRoleDto) {
    const logger = getRequestLogger();
    const { role } = data;

    logger.info({
      event: LOG_EVENTS.USER_ROLE_UPDATE_STARTED,
      targetUserId: userId,
      newRole: role,
    });

    // Step 1: Verify user exists
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

    // Step 2: Prevent redundant assignment
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

    // Step 3: Update role in database
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

    // Step 4: Invalidate Redis caches
    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");
    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }

    return updatedUser;
  }

  /**
   * --------------------------------------------------------------------------
   * 4. Update User Status
   * --------------------------------------------------------------------------
   * Updates user account status (ACTIVE / SUSPENDED / BANNED), invalidating caches.
   *
   * @param userId - Target user ID
   * @param data - Status update payload
   * @returns Updated user profile
   */
  async updateUserStatus(userId: string, data: UpdateUserStatusDto) {
    const logger = getRequestLogger();
    const { status } = data;

    logger.info({
      event: LOG_EVENTS.USER_STATUS_UPDATE_STARTED,
      targetUserId: userId,
      newStatus: status,
    });

    // Step 1: Verify user exists
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

    // Step 2: Prevent redundant assignment
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

    // Step 3: Update status in database
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

    // Step 4: Invalidate Redis caches
    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");
    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }

    return updatedUser;
  }

  /**
   * --------------------------------------------------------------------------
   * 5. Delete User Account (Atomic Deletion & Immediate Revocation)
   * --------------------------------------------------------------------------
   * Atomically updates user status to DELETED, sets deletedAt, and purges all
   * active Session and RefreshToken records in a single database transaction.
   * Also invalidates user profile and paginated listing caches in Redis.
   *
   * @param userId - Target user ID to delete
   */
  async deleteUser(userId: string) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.USER_DELETION_STARTED,
      targetUserId: userId,
    });

    // Step 1: Verify user exists and is not already deleted
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

    // Step 2: Atomically mark user as DELETED and purge all active sessions/tokens
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          status: "DELETED",
          deletedAt: new Date(),
        },
      });

      await tx.refreshToken.deleteMany({
        where: {
          userId,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId,
        },
      });
    });

    logger.info({
      event: LOG_EVENTS.USER_DELETED,
      targetUserId: userId,
    });

    // Step 3: Invalidate user and admin listing caches in Redis
    await cacheRedis.del(`user:${userId}`);
    await cacheRedis.del(`admin:user:${userId}`);

    const keys = await cacheRedis.keys("admin:users:*");
    if (keys.length > 0) {
      await cacheRedis.del(...keys);
    }
  }
}

export const adminService = new AdminService();
