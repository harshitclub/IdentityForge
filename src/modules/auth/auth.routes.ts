import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  logout,
  refreshToken,
  resendVerification,
  resetPassword,
  revokeAllSessions,
  signup,
  verifyEmail,
} from "./auth.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import {
  changePasswordSchema,
  forgetPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.validator.js";
import { authenticateUser } from "../../shared/middlewares/authenticate.user.js";

const authRoutes = Router();

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Creates a new user account and sends a verification email.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Harshit
 *               lastName:
 *                 type: string
 *                 example: Kumar
 *               email:
 *                 type: string
 *                 format: email
 *                 example: harshitclub@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password@123
 *
 *     responses:
 *       201:
 *         description: Account created successfully. Please verify your email.
 *       400:
 *         description: Validation failed.
 *       409:
 *         description: User already exists.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post("/signup", validate(registerSchema), signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login a user
 *     description: Authenticates the user and sets access and refresh token cookies.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: harshitclub@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password@123
 *
 *     responses:
 *       200:
 *         description: Login successful.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Invalid email or password.
 *       403:
 *         description: Account is locked.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post("/login", validate(loginSchema), login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout the current user
 *     description: Clears the authentication cookies and invalidates the current session.
 *
 *     responses:
 *       200:
 *         description: Logout successful.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post("/logout", logout);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Generates a new access token using the refresh token cookie.
 *
 *     security:
 *       - RefreshCookie: []
 *
 *     responses:
 *       200:
 *         description: Token refreshed successfully.
 *       401:
 *         description: Invalid or expired refresh token.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post("/refresh-token", refreshToken);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify user email
 *     description: Verifies a user's email address using the verification token.
 *
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token.
 *
 *     responses:
 *       200:
 *         description: Email verified successfully.
 *       400:
 *         description: Invalid or expired verification token.
 *       409:
 *         description: Email is already verified.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post("/verify-email", verifyEmail);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Resend verification email
 *     description: Sends a new email verification link to the authenticated user.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     responses:
 *       200:
 *         description: Verification email sent successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 *       409:
 *         description: Email is already verified.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post("/resend-verification", authenticateUser, resendVerification);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request a password reset
 *     description: Sends a password reset link to the user's email if the account exists.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: harshitclub@gmail.com
 *
 *     responses:
 *       200:
 *         description: Password reset email sent successfully.
 *       400:
 *         description: Validation failed.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post(
  "/forgot-password",
  validate(forgetPasswordSchema),
  forgotPassword,
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset user password
 *     description: Resets the user's password using a valid password reset token.
 *
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *       400:
 *         description: Validation failed or token is invalid, expired, or already used.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPassword,
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Change user password
 *     description: Changes the password of the authenticated user and revokes all active sessions.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: OldPassword@123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *       400:
 *         description: Validation failed or current password is incorrect.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post(
  "/change-password",
  authenticateUser,
  validate(changePasswordSchema),
  changePassword,
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user
 *     description: Retrieves the profile of the authenticated user.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     responses:
 *       200:
 *         description: Profile retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
authRoutes.get("/me", authenticateUser, getMe);

/**
 * @swagger
 * /auth/revoke-all-sessions:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Revoke all active sessions
 *     description: Revokes all active sessions for the authenticated user and clears authentication cookies.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     responses:
 *       200:
 *         description: All sessions revoked successfully.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
authRoutes.post("/revoke-all-sessions", authenticateUser, revokeAllSessions);

export default authRoutes;
