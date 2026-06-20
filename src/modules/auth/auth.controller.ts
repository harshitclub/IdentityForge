import type { Request, Response } from "express";

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { AppError } from "../../shared/utils/appError.js";
import { logger } from "../../config/logger.js";
import { maskEmail } from "../../shared/utils/mask.js";
import { hashPassword } from "../../shared/utils/auth/password.js";
import { prisma } from "../../config/prisma.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  SUCCESS_MESSAGES,
} from "../../constants/index.js";
import { generateVerificationTokenRaw } from "../../shared/utils/auth/verificationToken.js";
import { sha256Hex } from "../../shared/utils/auth/sha256Hex.js";
import { env } from "../../config/env.js";
import { sendVerificationEmail } from "../../emails/email.service.js";
import { emailQueue } from "../../jobs/queues/email.queue.js";
import { EMAIL_JOBS } from "../../constants/jobs/jobs.js";

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
      `Signup blocked: Email already exists | email=${maskEmail(email)}`,
    );
    throw new AppError(
      ERROR_MESSAGES.USER_ALREADY_EXISTS,
      HTTP_STATUS.CONFLICT,
    );
  }

  const hashedPassword = await hashPassword(password);

  const { raw: rawToken, expiresAt } = generateVerificationTokenRaw(15);
  const tokenHash = sha256Hex(rawToken);

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip;

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
      },
    });
    await tx.emailVerificationToken.create({
      data: {
        userId: createdUser.id,
        tokenHash,
        expiresAt,
      },
    });
    return createdUser;
  });

  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

  await emailQueue.add(EMAIL_JOBS.VERIFICATION, {
    email: user.email,
    firstName: user.firstName ?? "User",
    verificationUrl,
  });
  logger.info(`Verification email job queued for ${user.email}`);

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.SIGNUP_SUCCESS,
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
