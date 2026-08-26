import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { SUCCESS_MESSAGES } from "../../constants/index.js";
import { userService } from "./user.service.js";

/**
 * ============================================================================
 * User Controller Handlers
 * ============================================================================
 * Request handlers for authenticated user operations including profile edits,
 * self-account deletion, active session discovery, and specific session revocation.
 */

/**
 * ----------------------------------------------------------------------------
 * 1. Update Profile Handler
 * ----------------------------------------------------------------------------
 * @desc    Updates user's first name, last name, or username.
 * @route   PATCH /api/v1/users/profile
 * @access  Private (Authenticated User)
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
 * ----------------------------------------------------------------------------
 * 2. Delete Account Handler
 * ----------------------------------------------------------------------------
 * @desc    Soft-deletes user account, revokes all sessions, and clears cookies.
 * @route   DELETE /api/v1/users/account
 * @access  Private (Authenticated User)
 */
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    await userService.deleteAccount(req.user.id);

    // Clear client authentication cookies
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
 * ----------------------------------------------------------------------------
 * 3. Get Active Sessions Handler
 * ----------------------------------------------------------------------------
 * @desc    Retrieves all unexpired active sessions for current user.
 * @route   GET /api/v1/users/sessions
 * @access  Private (Authenticated User)
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
 * ----------------------------------------------------------------------------
 * 4. Revoke Session Handler
 * ----------------------------------------------------------------------------
 * @desc    Revokes a specific session belonging to the user (excluding current session).
 * @route   DELETE /api/v1/users/sessions/:sessionId
 * @access  Private (Authenticated User)
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
