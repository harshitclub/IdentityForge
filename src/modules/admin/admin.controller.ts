import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { SUCCESS_MESSAGES } from "../../constants/index.js";
import { adminService } from "./admin.service.js";

/**
 * ============================================================================
 * Admin Controller Handlers
 * ============================================================================
 * Request handlers for administrative endpoints including paginated user discovery,
 * user inspection, role/status modifications, and account deletion.
 */

/**
 * ----------------------------------------------------------------------------
 * 1. Get All Users (Paginated)
 * ----------------------------------------------------------------------------
 * @desc    Retrieves paginated list of all users.
 * @route   GET /api/v1/admin/users
 * @access  Private (Admin only)
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  // Sanitize page and limit parameters with bounds
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

  const { data, cached } = await adminService.getAllUsers({
    page,
    limit,
  });

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.USERS_FETCHED,
    data,
    cached,
  });
});

/**
 * ----------------------------------------------------------------------------
 * 2. Get User Details By ID
 * ----------------------------------------------------------------------------
 * @desc    Retrieves full profile details for a specific user ID.
 * @route   GET /api/v1/admin/users/:id
 * @access  Private (Admin only)
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { user, cached } = await adminService.getUserById(
    req.params.id as string,
  );

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.USER_FETCHED,
    data: user,
    cached,
  });
});

/**
 * ----------------------------------------------------------------------------
 * 3. Update User Authorization Role
 * ----------------------------------------------------------------------------
 * @desc    Promotes or demotes user role (USER <-> ADMIN).
 * @route   PATCH /api/v1/admin/users/:id/role
 * @access  Private (Admin only)
 */
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const updatedUser = await adminService.updateUserRole(
      req.params.id as string,
      req.body,
    );

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.USER_ROLE_UPDATED,
      data: updatedUser,
    });
  },
);

/**
 * ----------------------------------------------------------------------------
 * 4. Update User Account Status
 * ----------------------------------------------------------------------------
 * @desc    Modifies user status (ACTIVE, SUSPENDED, BANNED).
 * @route   PATCH /api/v1/admin/users/:id/status
 * @access  Private (Admin only)
 */
export const updateUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const updatedUser = await adminService.updateUserStatus(
      req.params.id as string,
      req.body,
    );

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.USER_STATUS_UPDATED,
      data: updatedUser,
    });
  },
);

/**
 * ----------------------------------------------------------------------------
 * 5. Delete User Account
 * ----------------------------------------------------------------------------
 * @desc    Soft-deletes user record and purges active sessions and tokens immediately.
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private (Admin only)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteUser(req.params.id as string);

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.USER_DELETED,
  });
});
