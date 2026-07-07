import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/utils/appError.js";
import { cacheRedis } from "../../config/redis.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  SUCCESS_MESSAGES,
} from "../../constants/index.js";

/**
 * @desc    Get User Profile
 * @route   GET /api/v1/users/profile
 */

/**
 * @desc    Update User Profile
 * @route   PATCH /api/v1/users/profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.user;

    const { firstName, lastName, username } = req.body;
    const updateData: Prisma.UserUpdateInput = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (username !== undefined) updateData.username = username;

    // Check if username is already taken
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: {
            id,
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

    // Update profile
    const updatedUser = await prisma.user.update({
      where: {
        id,
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

    // Invalidate cache
    await cacheRedis.del(`user:${id}`);

    return apiResponse({
      req,
      res,
      data: updatedUser,
      message: SUCCESS_MESSAGES.PROFILE_UPDATED_SUCCESS,
    });
  },
);

/**
 * @desc    Delete Account
 * @route   DELETE /api/v1/users/account
 */
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "Account deleted successfully",
    });
  },
);

/**
 * @desc    Get User Sessions
 * @route   GET /api/v1/users/sessions
 */
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.user;

  const sessions = await prisma.session.findMany({
    where: {
      userId: id,
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

  return apiResponse({
    req,
    res,
    data: {
      sessions,
      total: sessions.length,
    },
    message: SUCCESS_MESSAGES.SESSION_FETCHED,
  });
});

/**
 * @desc    Revoke Session
 * @route   DELETE /api/v1/users/sessions/:sessionId
 */
export const revokeSession = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.SESSION_REVOKED,
    });
  },
);
