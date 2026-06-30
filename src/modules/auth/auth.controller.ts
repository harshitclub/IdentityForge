import type { Request, Response } from "express";

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { AppError } from "../../shared/utils/appError.js";
import { logger } from "../../config/logger.js";
import { maskEmail } from "../../shared/utils/mask.js";
import {
  comparePassword,
  hashPassword,
} from "../../shared/utils/auth/password.js";
import { prisma } from "../../config/prisma.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  SUCCESS_MESSAGES,
} from "../../constants/index.js";
import { generateVerificationTokenRaw } from "../../shared/utils/auth/verificationToken.js";
import { sha256Hex } from "../../shared/utils/auth/sha256Hex.js";
import { env } from "../../config/env.js";
import { emailQueue } from "../../jobs/queues/email.queue.js";
import { EMAIL_JOBS } from "../../constants/jobs/jobs.js";
import { generateAccessToken } from "../../shared/utils/auth/accessToken.js";
import {
  generateRefreshTokenWithJti,
  verifyRefreshToken,
} from "../../shared/utils/auth/refreshToken.js";
import { cacheRedis } from "../../config/redis.js";
import { generateResetPasswordTokenRaw } from "../../shared/utils/auth/resetPasswordToken.js";

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
    data: {},
  });
});

/**
 * @desc    Login User
 * @route   POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      role: true,
      password: true,
      failedLoginAttempts: true,
      lockUntil: true,
    },
  });

  // Generic error
  if (!user) {
    throw new AppError(
      ERROR_MESSAGES.INVALID_CREDENTIALS,
      HTTP_STATUS.UNAUTHORIZED,
    );
  }

  // Account is currently locked
  if (user.lockUntil && user.lockUntil > now) {
    logger.warn(`Login blocked: Account locked | userId=${user.id}`);

    throw new AppError(ERROR_MESSAGES.ACCOUNT_LOCKED, HTTP_STATUS.FORBIDDEN);
  }

  // Password verification
  const isPasswordValid = await comparePassword(password, user.password!);

  if (!isPasswordValid) {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
      },
      select: {
        failedLoginAttempts: true,
      },
    });

    if (updatedUser.failedLoginAttempts >= env.MAX_FAILED_LOGIN) {
      const lockUntil = new Date(
        Date.now() + env.ACCOUNT_LOCK_DURATION * 60 * 1000,
      );

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lockUntil,
        },
      });

      logger.warn(`Account locked | userId=${user.id}`);

      throw new AppError(ERROR_MESSAGES.ACCOUNT_LOCKED, HTTP_STATUS.FORBIDDEN);
    }

    throw new AppError(
      ERROR_MESSAGES.INVALID_CREDENTIALS,
      HTTP_STATUS.UNAUTHORIZED,
    );
  }
  // Successful login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockUntil: null,
      lastLoginAt: now,
    },
  });

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const { token: refreshJwt, jti } = generateRefreshTokenWithJti({
    id: user.id,
  });

  const refreshJtiHash = sha256Hex(jti);
  const refreshExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN);

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshJtiHash,
        expiresAt: refreshExpiresAt,
      },
    });

    await tx.session.create({
      data: {
        userId: user.id,
        ipAddress: req.ip ?? null,
        userAgent: req.headers["user-agent"]?.toString() ?? null,
        isCurrent: true,
        expiresAt: refreshExpiresAt,
      },
    });

    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLoginAt: now,
      },
    });
  });

  res.cookie("if_accessToken", accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: env.JWT_ACCESS_EXPIRES_IN * 1000,
  });

  res.cookie("if_refreshToken", refreshJwt, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: env.JWT_REFRESH_EXPIRES_IN * 1000,
  });

  const safeUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    role: user.role,
  };
  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    data: safeUser,
  });
});

/**
 * @desc    Logout User
 * @route   POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { if_refreshToken: refreshToken } = req.cookies;

  // If cookies are already gone, logout is still successful.
  if (!refreshToken) {
    res.clearCookie("if_accessToken");
    res.clearCookie("if_refreshToken");

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
    });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    const refreshJtiHash = sha256Hex(payload.jti!);

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({
        where: {
          tokenHash: refreshJtiHash,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId: payload.id,
        },
      });
    });

    // Invalidate cached profile
    await cacheRedis.del(`user:${payload.id}`);

    logger.info(`User logged out | userId=${payload.id}`);
  } catch {
    // Ignore invalid/expired refresh tokens.
    // Logout should always succeed from the client's perspective.
  }

  res.clearCookie("if_accessToken");
  res.clearCookie("if_refreshToken");

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
  });
});

/**
 * @desc    Refresh Access Token
 * @route   POST /api/v1/auth/refresh-token
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    // Read refresh cookie
    const { if_refreshToken: refreshToken } = req.cookies;

    if (!refreshToken) {
      logger.warn("Refresh token cookie missing.");
      throw new AppError(
        ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    // Verify JWT signature & expiration
    const tokenPayload = verifyRefreshToken(refreshToken);

    // Hash JTI
    const refreshJtiHash = sha256Hex(tokenPayload.jti!);

    // Verify refresh token exists
    const storedRefreshToken = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: refreshJtiHash,
      },
    });

    if (!storedRefreshToken) {
      logger.warn(`Refresh token revoked | userId=${tokenPayload.id}`);

      throw new AppError(
        ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        id: tokenPayload.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Generate new refresh token
    const { token: newRefreshToken, jti } = generateRefreshTokenWithJti({
      id: user.id,
    });

    const newRefreshJtiHash = sha256Hex(jti);

    const refreshExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN);

    // Rotate refresh token
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({
        where: {
          tokenHash: refreshJtiHash,
        },
      });

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newRefreshJtiHash,
          expiresAt: refreshExpiresAt,
        },
      });
    });

    // Set new cookies
    res.cookie("if_accessToken", accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: env.JWT_ACCESS_EXPIRES_IN * 1000,
    });

    res.cookie("if_refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: env.JWT_REFRESH_EXPIRES_IN * 1000,
    });

    return apiResponse({
      req,
      res,
      message: "Token refreshed successfully",
      data: {},
    });
  },
);

/**
 * @desc    Verify Email
 * @route   POST /api/v1/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = req.query.token;

  if (!token || typeof token !== "string") {
    throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
  }

  const tokenHash = sha256Hex(token);

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        select: {
          id: true,
          isEmailVerified: true,
        },
      },
    },
  });

  if (!verificationToken) {
    throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
  }

  if (verificationToken.expiresAt < new Date()) {
    throw new AppError(ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.BAD_REQUEST);
  }

  if (verificationToken.user.isEmailVerified) {
    throw new AppError(
      ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED,
      HTTP_STATUS.CONFLICT,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: verificationToken.user.id,
      },
      data: {
        isEmailVerified: true,
      },
    });

    await tx.emailVerificationToken.delete({
      where: {
        id: verificationToken.id,
      },
    });
  });

  logger.info(
    `Email verified successfully | userId=${verificationToken.user.id}`,
  );

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.EMAIL_VERIFIED_SUCCESS,
    data: {},
  });
});

/**
 * @desc    Resend Verification Email
 * @route   POST /api/v1/auth/resend-verification
 */
export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.isEmailVerified) {
      throw new AppError(
        ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED,
        HTTP_STATUS.CONFLICT,
      );
    }

    // Remove any previous verification tokens
    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Generate a fresh verification token
    const { raw: rawToken, expiresAt } = generateVerificationTokenRaw(15);
    const tokenHash = sha256Hex(rawToken);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

    await emailQueue.add(EMAIL_JOBS.VERIFICATION, {
      email: user.email,
      firstName: user.firstName ?? "User",
      verificationUrl,
    });

    logger.info(
      `Verification email re-queued | userId=${user.id} | email=${user.email}`,
    );

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.EMAIL_VERIFICATION_SENT,
    });
  },
);

/**
 * @desc    Forgot Password
 * @route   POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    });

    // Prevent user enumeration
    if (!user) {
      return apiResponse({
        req,
        res,
        message: SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
      });
    }

    // Invalidate any previous unused reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Generate a new reset token
    const { raw: resetPasswordToken, expiresAt } =
      generateResetPasswordTokenRaw();

    const hashedResetPasswordToken = sha256Hex(resetPasswordToken);

    // Store the hashed token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedResetPasswordToken,
        expiresAt,
      },
    });

    const resetPasswordUrl = `${env.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;

    // Queue the email
    await emailQueue.add(EMAIL_JOBS.RESET_PASSWORD, {
      email: user.email,
      resetPasswordUrl,
    });
    logger.info(`Password reset email queued for user ${user.id}`);

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
    });
  },
);

/**
 * @desc    Reset Password
 * @route   POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.query.token;
    const { newPassword } = req.body;
    if (!token || typeof token !== "string") {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
    }

    const tokenHash = sha256Hex(token);

    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            password: true,
          },
        },
      },
    });

    if (!passwordResetToken) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
    }

    if (passwordResetToken.usedAt) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
    }

    if (passwordResetToken.expiresAt < new Date()) {
      throw new AppError(ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    // Prevent reusing the same password
    const isSamePassword = await comparePassword(
      newPassword,
      passwordResetToken.user.password!,
    );

    if (isSamePassword) {
      throw new AppError(ERROR_MESSAGES.SAME_PASSWORD, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: passwordResetToken.user.id,
        },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });

      await tx.passwordResetToken.update({
        where: {
          id: passwordResetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      });

      // Logout from all devices
      await tx.refreshToken.deleteMany({
        where: {
          userId: passwordResetToken.user.id,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId: passwordResetToken.user.id,
        },
      });
    });

    // Invalidate cached profile
    await cacheRedis.del(`user:${passwordResetToken.user.id}`);

    // Clear auth cookies
    res.clearCookie("if_accessToken");
    res.clearCookie("if_refreshToken");

    logger.info(
      `Password reset successfully | userId=${passwordResetToken.user.id}`,
    );

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS,
    });
  },
);

/**
 * @desc    Change Password
 * @route   POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password!,
    );

    if (!isPasswordValid) {
      throw new AppError(
        ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Prevent using the same password again
    const isSamePassword = await comparePassword(newPassword, user.password!);

    if (isSamePassword) {
      throw new AppError(ERROR_MESSAGES.SAME_PASSWORD, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      });

      // Logout from all devices
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

    // Invalidate cached profile
    await cacheRedis.del(`user:${user.id}`);

    // Clear auth cookies
    res.clearCookie("if_accessToken");
    res.clearCookie("if_refreshToken");
    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.PASSWORD_CHANGED_SUCCESS,
    });
  },
);

/**
 * @desc    Get Current User
 * @route   GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.user;

  const cacheKey = `user:${id}`;

  // 1. Check cache
  const cachedUser = await cacheRedis.get(cacheKey);

  if (cachedUser) {
    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.PROFILE_FETCHED_SUCCESS,
      data: {
        user: JSON.parse(cachedUser),
      },
      cached: true,
    });
  }

  // 2. Fetch from database
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // 3. Cache user for 5 minutes
  await cacheRedis.set(cacheKey, JSON.stringify(user), "EX", 60 * 5);

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.PROFILE_FETCHED_SUCCESS,
    data: { user },
    cached: false,
  });
});

/**
 * @desc    Revoke All Sessions
 * @route   POST /api/v1/auth/revoke-all-sessions
 */
export const revokeAllSessions = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.user;

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({
        where: {
          userId: id,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId: id,
        },
      });
    });

    // Invalidate cached profile
    await cacheRedis.del(`user:${id}`);

    // Clear authentication cookies
    res.clearCookie("if_accessToken");
    res.clearCookie("if_refreshToken");

    logger.info(`All sessions revoked | userId=${id}`);

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.ALL_SESSIONS_REVOKED_SUCCESS,
    });
  },
);
