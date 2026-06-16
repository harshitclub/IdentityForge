import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";
import { logger } from "../../config/logger.js";
import { maskEmail } from "../../utils/mask.js";
import { hashPassword } from "../../utils/auth/password.js";
import { prisma } from "../../config/prisma.js";
import { createLogContext } from "../../utils/loggerContext.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../constants/index.js";

/**
 * @desc    Signup User
 * @route   POST /api/v1/auth/signup
 */
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    logger.warn(
      createLogContext(LOG_EVENTS.USER_ALREADY_EXISTS, {
        operation: "signup",
        email: maskEmail(email),
      }),
    );
    throw new AppError(
      ERROR_MESSAGES.USER_ALREADY_EXISTS,
      HTTP_STATUS.CONFLICT,
    );
  }

  const encryptPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: encryptPassword,
    },
  });

  return apiResponse({
    req,
    res,
    message: "Signup successful",
  });
});

/**
 * @desc    Login User
 * @route   POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Login successful",
  });
});

/**
 * @desc    Logout User
 * @route   POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Logout successful",
  });
});

/**
 * @desc    Refresh Access Token
 * @route   POST /api/v1/auth/refresh-token
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "Token refreshed successfully",
    });
  },
);

/**
 * @desc    Verify Email
 * @route   POST /api/v1/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Email verified successfully",
  });
});

/**
 * @desc    Resend Verification Email
 * @route   POST /api/v1/auth/resend-verification
 */
export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "Verification email sent successfully",
    });
  },
);

/**
 * @desc    Forgot Password
 * @route   POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "Password reset email sent successfully",
    });
  },
);

/**
 * @desc    Reset Password
 * @route   POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "Password reset successful",
    });
  },
);

/**
 * @desc    Change Password
 * @route   POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "Password changed successfully",
    });
  },
);

/**
 * @desc    Get Current User
 * @route   GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Current user fetched successfully",
  });
});

/**
 * @desc    Revoke All Sessions
 * @route   POST /api/v1/auth/revoke-all-sessions
 */
export const revokeAllSessions = asyncHandler(
  async (req: Request, res: Response) => {
    return apiResponse({
      req,
      res,
      message: "All sessions revoked successfully",
    });
  },
);
