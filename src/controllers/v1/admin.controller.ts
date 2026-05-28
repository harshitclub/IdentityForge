import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";

/**
 * @desc    Get All Users
 * @route   GET /api/v1/admin/users
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Users fetched successfully",
  });
});

/**
 * @desc    Get User By ID
 * @route   GET /api/v1/admin/users/:id
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "User fetched successfully",
  });
});

/**
 * @desc    Update User Role
 * @route   PATCH /api/v1/admin/users/:id/role
 */
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "User role updated successfully",
    });
  },
);

/**
 * @desc    Update User Status
 * @route   PATCH /api/v1/admin/users/:id/status
 */
export const updateUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "User status updated successfully",
    });
  },
);

/**
 * @desc    Delete User
 * @route   DELETE /api/v1/admin/users/:id
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "User deleted successfully",
  });
});
