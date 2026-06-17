import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";

/**
 * @desc    Get User Profile
 * @route   GET /api/v1/users/profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Profile fetched successfully",
  });
});

/**
 * @desc    Update User Profile
 * @route   PATCH /api/v1/users/profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "Profile updated successfully",
    });
  },
);

/**
 * @desc    Update Avatar
 * @route   PATCH /api/v1/users/avatar
 */
export const updateAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "Avatar updated successfully",
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
  return apiResponse({
    req,
    res,
    message: "Sessions fetched successfully",
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
      message: "Session revoked successfully",
    });
  },
);
