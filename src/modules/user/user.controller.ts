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
import { userService } from "./user.service.js";

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
    const updatedUser = await userService.updateProfile(req.user.id, req.body);

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
    await userService.deleteAccount(req.user.id);

    // Clear authentication cookies
    res.clearCookie("if_accessToken");
    res.clearCookie("if_refreshToken");

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.ACCOUNT_DELETED_SUCCESS,
    });
  },
);

/**
 * @desc    Get User Sessions
 * @route   GET /api/v1/users/sessions
 */
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await userService.getSessions(req.user.id);

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
    await userService.revokeSession(
      req.user.id,
      req.params.sessionId as string,
    );

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.SESSION_REVOKED,
    });
  },
);
