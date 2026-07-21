import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { SUCCESS_MESSAGES } from "../../constants/index.js";
import { adminService } from "./admin.service.js";

/**
 * @desc    Get All Users
 * @route   GET /api/v1/admin/users
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
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
 * @desc    Get User By ID
 * @route   GET /api/v1/admin/users/:id
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
 * @desc    Update User Role
 * @route   PATCH /api/v1/admin/users/:id/role
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
 * @desc    Update User Status
 * @route   PATCH /api/v1/admin/users/:id/status
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
 * @desc    Delete User
 * @route   DELETE /api/v1/admin/users/:id
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteUser(req.params.id as string);

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.USER_DELETED,
  });
});
