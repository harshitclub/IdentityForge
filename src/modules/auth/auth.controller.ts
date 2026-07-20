import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { AppError } from "../../shared/utils/appError.js";
import { logger } from "../../config/logger.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  SUCCESS_MESSAGES,
} from "../../constants/index.js";
import { env } from "../../config/env.js";
import { getSessionMetadata } from "../../shared/utils/session.util.js";
import { authService } from "./auth.service.js";

/**
 * @desc    Signup User
 * @route   POST /api/v1/auth/signup
 */
export const signup = asyncHandler(async (req: Request, res: Response) => {
  await authService.signup(req.body);

  return apiResponse({
    req,
    res,
    statusCode: HTTP_STATUS.CREATED,
    message: SUCCESS_MESSAGES.SIGNUP_SUCCESS,
    data: {},
  });
});

/**
 * @desc    Login User
 * @route   POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const sessionMetadata = getSessionMetadata(req);

  const { accessToken, refreshToken, user } = await authService.login(
    req.body,
    sessionMetadata,
  );

  res.cookie("if_accessToken", accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: env.JWT_ACCESS_EXPIRES_IN * 1000,
  });

  res.cookie("if_refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: env.JWT_REFRESH_EXPIRES_IN * 1000,
  });

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    data: user,
  });
});

/**
 * @desc    Logout User
 * @route   POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { if_refreshToken: refreshToken } = req.cookies;

  await authService.logout(refreshToken);

  await authService.logout(refreshToken);

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
    // Read refresh token cookie
    const { if_refreshToken: refreshToken } = req.cookies;

    if (!refreshToken) {
      logger.warn("Refresh token cookie missing.");

      throw new AppError(
        ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.cookie("if_accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: env.JWT_ACCESS_EXPIRES_IN * 1000,
    });

    res.cookie("if_refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: env.JWT_REFRESH_EXPIRES_IN * 1000,
    });

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.TOKEN_REFRESH_SUCCESS,
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

  await authService.verifyEmail(token);

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
    await authService.resendVerification(req.user.id);

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
    await authService.forgotPassword(req.body);

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

    if (!token || typeof token !== "string") {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
    }

    await authService.resetPassword(token, req.body);

    // Clear auth cookies
    res.clearCookie("if_accessToken");
    res.clearCookie("if_refreshToken");

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
    await authService.changePassword(req.user.id, req.body);

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
  const { user, cached } = await authService.getMe(req.user.id);

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.PROFILE_FETCHED_SUCCESS,
    data: { user },
    cached,
  });
});

/**
 * @desc    Revoke All Sessions
 * @route   POST /api/v1/auth/revoke-all-sessions
 */
export const revokeAllSessions = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.revokeAllSessions(req.user.id);

    // Clear authentication cookies
    res.clearCookie("if_accessToken");
    res.clearCookie("if_refreshToken");

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.ALL_SESSIONS_REVOKED_SUCCESS,
    });
  },
);
