import { prisma } from "../../config/prisma.js";
import { cacheRedis } from "../../config/redis.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../constants/index.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../shared/utils/appError.js";
import type { UpdateProfileDto } from "./user.types.js";

class UserService {
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const { firstName, lastName, username } = data;

    const updateData: Prisma.UserUpdateInput = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (username !== undefined) updateData.username = username;

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
        throw new AppError(
          ERROR_MESSAGES.USERNAME_ALREADY_TAKEN,
          HTTP_STATUS.CONFLICT,
        );
      }
    }

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

    await cacheRedis.del(`user:${userId}`);

    return updatedUser;
  }

  async deleteAccount(userId: string) {
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
      throw new AppError(
        ERROR_MESSAGES.ACCOUNT_ALREADY_DELETED,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

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

    await cacheRedis.del(`user:${user.id}`);
  }

  async getSessions(userId: string) {
    return prisma.session.findMany({
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
  }

  async revokeSession(userId: string, sessionId: string) {
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
      throw new AppError(
        ERROR_MESSAGES.SESSION_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (session.userId !== userId) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (session.isCurrent) {
      throw new AppError(
        ERROR_MESSAGES.CURRENT_SESSION_CANNOT_BE_REVOKED,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });
  }
}

export const userService = new UserService();
