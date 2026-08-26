import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { AppError } from "../../shared/utils/appError.js";
import { getRequestLogger } from "../../shared/request-context/request-context.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
  SUCCESS_MESSAGES,
} from "../../constants/index.js";
import { env } from "../../config/env.js";
import { getSessionMetadata } from "../../shared/utils/session.util.js";
import { authService } from "./auth.service.js";

/**
 * ============================================================================
 * Auth Controller Handlers
 * ============================================================================
 * Handles HTTP requests, extracts cookies/metadata, coordinates with AuthService,
 * and sets/clears authentication cookies on client responses.
 */

/**
 * ----------------------------------------------------------------------------
 * 1. User Registration Handler
 * ----------------------------------------------------------------------------
 * @desc    Registers a new user and queues a verification email.
 * @route   POST /api/v1/auth/signup
 * @access  Public
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
 * ----------------------------------------------------------------------------
 * 2. User Login Handler
 * ----------------------------------------------------------------------------
 * @desc    Authenticates credentials and sets HTTP-only access & refresh cookies.
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Extract client device & browser metadata from request headers
  const sessionMetadata = getSessionMetadata(req);

  const { accessToken, refreshToken, user } = await authService.login(
    req.body,
    sessionMetadata,
  );

  // Set short-lived Access Token in HTTP-only cookie
  res.cookie("if_accessToken", accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: env.JWT_ACCESS_EXPIRES_IN * 1000,
  });

  // Set long-lived Refresh Token in HTTP-only cookie
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
 * ----------------------------------------------------------------------------
 * 3. User Logout Handler
 * ----------------------------------------------------------------------------
 * @desc    Invalidates current refresh token & session and clears cookies.
 * @route   POST /api/v1/auth/logout
 * @access  Public
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { if_refreshToken: refreshToken } = req.cookies;

  await authService.logout(refreshToken);

  // Always clear authentication cookies on the client
  res.clearCookie("if_accessToken");
  res.clearCookie("if_refreshToken");

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
  });
});

/**
 * ----------------------------------------------------------------------------
 * 4. Refresh Token Rotation Handler
 * ----------------------------------------------------------------------------
 * @desc    Validates existing refresh token and issues rotated tokens.
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (Cookie-based)
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const logger = getRequestLogger();
    const { if_refreshToken: refreshToken } = req.cookies;

    if (!refreshToken) {
      logger.warn({
        event: LOG_EVENTS.REFRESH_TOKEN_COOKIE_MISSING,
      });

      throw new AppError(
        ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const tokens = await authService.refreshToken(refreshToken);

    // Issue updated rotated tokens in cookies
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
 * ----------------------------------------------------------------------------
 * 5. Email Verification Handler
 * ----------------------------------------------------------------------------
 * @desc    Verifies account email using a one-time cryptographic token.
 * @route   POST /api/v1/auth/verify-email
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = req.query.token;
  const logger = getRequestLogger();

  if (!token || typeof token !== "string") {
    logger.warn({
      event: LOG_EVENTS.INVALID_VERIFY_EMAIL_REQUEST,
    });
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
 * ----------------------------------------------------------------------------
 * 6. Resend Verification Email Handler
 * ----------------------------------------------------------------------------
 * @desc    Generates a new verification token and sends email to authenticated user.
 * @route   POST /api/v1/auth/resend-verification
 * @access  Private (Authenticated User)
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
 * ----------------------------------------------------------------------------
 * 7. Forgot Password Request Handler
 * ----------------------------------------------------------------------------
 * @desc    Generates password reset token and queues password reset email.
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
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
 * ----------------------------------------------------------------------------
 * 8. Reset Password Execution Handler
 * ----------------------------------------------------------------------------
 * @desc    Resets password using valid token and purges existing active sessions.
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.query.token;
    const logger = getRequestLogger();

    if (!token || typeof token !== "string") {
      logger.warn({
        event: LOG_EVENTS.INVALID_RESET_PASSWORD_REQUEST,
      });
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
    }

    await authService.resetPassword(token, req.body);

    // Clear any active session cookies
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
 * ----------------------------------------------------------------------------
 * 9. Change Password Handler
 * ----------------------------------------------------------------------------
 * @desc    Changes password for authenticated user and revokes active sessions.
 * @route   POST /api/v1/auth/change-password
 * @access  Private (Authenticated User)
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.changePassword(req.user.id, req.body);

    // Clear cookies requiring user to re-login with new password
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
 * ----------------------------------------------------------------------------
 * 10. Get Current User Profile Handler
 * ----------------------------------------------------------------------------
 * @desc    Fetches authenticated user profile (utilizes Redis cache).
 * @route   GET /api/v1/auth/me
 * @access  Private (Authenticated User)
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
 * ----------------------------------------------------------------------------
 * 11. Revoke All Sessions Handler
 * ----------------------------------------------------------------------------
 * @desc    Revokes all active sessions for current user and clears cookies.
 * @route   POST /api/v1/auth/revoke-all-sessions
 * @access  Private (Authenticated User)
 */
export const revokeAllSessions = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.revokeAllSessions(req.user.id);

    // Clear client cookies
    res.clearCookie("if_accessToken");
    res.clearCookie("if_refreshToken");

    return apiResponse({
      req,
      res,
      message: SUCCESS_MESSAGES.ALL_SESSIONS_REVOKED_SUCCESS,
    });
  },
);
