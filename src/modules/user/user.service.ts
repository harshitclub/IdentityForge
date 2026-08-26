import { prisma } from "../../config/prisma.js";
import { cacheRedis } from "../../config/redis.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../constants/index.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { getRequestLogger } from "../../shared/request-context/request-context.js";
import { AppError } from "../../shared/utils/appError.js";
import type { UpdateProfileDto } from "./user.types.js";

/**
 * ============================================================================
 * UserService
 * ============================================================================
 * Business logic for user self-service operations including profile edits,
 * unique username verification, self-account deletion, active device session
 * discovery, and selective session revocation.
 */
class UserService {
  /**
   * --------------------------------------------------------------------------
   * 1. Update Profile Flow
   * --------------------------------------------------------------------------
   * Updates user first name, last name, or username.
   * If a username is provided, verifies uniqueness across other users.
   * Invalidates Redis user profile cache on completion.
   *
   * @param userId - ID of authenticated user
   * @param data - Update profile payload (firstName, lastName, username)
   * @returns Updated user profile data
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const logger = getRequestLogger();
    const { firstName, lastName, username } = data;

    logger.info({
      event: LOG_EVENTS.PROFILE_UPDATE_STARTED,
      userId,
    });

    const updateData: Prisma.UserUpdateInput = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (username !== undefined) updateData.username = username;

    // Step 1: Check username uniqueness if modified
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: {
            id: userId,
          },
        },
      });

      if (existingUser) {
        logger.warn({
          event: LOG_EVENTS.PROFILE_UPDATE_BLOCKED,
          reason: "USERNAME_ALREADY_TAKEN",
          userId,
          username,
        });
        throw new AppError(
          ERROR_MESSAGES.USERNAME_ALREADY_TAKEN,
          HTTP_STATUS.CONFLICT,
        );
      }
    }

    // Step 2: Update user record in database
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
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

    // Step 3: Invalidate user profile cache in Redis
    await cacheRedis.del(`user:${userId}`);

    logger.info({
      event: LOG_EVENTS.PROFILE_UPDATED,
      userId,
    });

    return updatedUser;
  }

  /**
   * --------------------------------------------------------------------------
   * 2. Self Account Deletion Flow
   * --------------------------------------------------------------------------
   * Soft-deletes user account (sets status: DELETED, deletedAt: now),
   * purges all active RefreshTokens and Sessions, and removes Redis cache.
   *
   * @param userId - ID of authenticated user
   */
  async deleteAccount(userId: string) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.ACCOUNT_DELETION_STARTED,
      userId,
    });

    // Step 1: Verify user exists and is not already deleted
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.deletedAt) {
      logger.warn({
        event: LOG_EVENTS.ACCOUNT_ALREADY_DELETED,
        userId,
      });
      throw new AppError(
        ERROR_MESSAGES.ACCOUNT_ALREADY_DELETED,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Step 2: Atomically soft-delete user and delete all active sessions/tokens
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          deletedAt: new Date(),
          status: "DELETED",
        },
      });

      await tx.refreshToken.deleteMany({
        where: {
          userId: user.id,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId: user.id,
        },
      });
    });

    logger.info({
      event: LOG_EVENTS.ACCOUNT_SOFT_DELETED,
      userId,
    });

    // Step 3: Invalidate cached profile in Redis
    await cacheRedis.del(`user:${user.id}`);
  }

  /**
   * --------------------------------------------------------------------------
   * 3. Get Active Sessions Flow
   * --------------------------------------------------------------------------
   * Queries all active, unexpired sessions for user sorted by last used timestamp.
   *
   * @param userId - ID of authenticated user
   * @returns Array of active device session objects
   */
  async getSessions(userId: string) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.SESSION_FETCH_STARTED,
      userId,
    });

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
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

    logger.info({
      event: LOG_EVENTS.SESSION_FETCH_COMPLETED,
      userId,
      totalSessions: sessions.length,
    });

    return sessions;
  }

  /**
   * --------------------------------------------------------------------------
   * 4. Revoke Session Flow
   * --------------------------------------------------------------------------
   * Revokes a specific active session. Validates session existence, ownership,
   * and prevents revoking the current active session (logout endpoint should be used instead).
   *
   * @param userId - ID of authenticated user
   * @param sessionId - ID of session to revoke
   */
  async revokeSession(userId: string, sessionId: string) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.SESSION_REVOKE_STARTED,
      userId,
      sessionId,
    });

    // Step 1: Verify session exists and belongs to user
    const session = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
        userId: true,
        isCurrent: true,
      },
    });

    if (!session) {
      logger.warn({
        event: LOG_EVENTS.SESSION_NOT_FOUND,
        sessionId,
      });
      throw new AppError(
        ERROR_MESSAGES.SESSION_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (session.userId !== userId) {
      logger.warn({
        event: LOG_EVENTS.SESSION_REVOKE_FORBIDDEN,
        userId,
        sessionId,
      });
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    // Step 2: Prevent revoking current active session via this endpoint
    if (session.isCurrent) {
      logger.warn({
        event: LOG_EVENTS.CURRENT_SESSION_REVOKE_BLOCKED,
        userId,
        sessionId,
      });
      throw new AppError(
        ERROR_MESSAGES.CURRENT_SESSION_CANNOT_BE_REVOKED,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Step 3: Delete session record
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    logger.info({
      event: LOG_EVENTS.SESSION_REVOKED,
      userId,
      sessionId,
    });
  }
}

export const userService = new UserService();
