import { Router } from "express";
import {
  deleteAccount,
  getSessions,
  revokeSession,
  updateProfile,
} from "./user.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { updateSchema } from "./user.validator.js";
import { authenticateUser } from "../../shared/middlewares/authenticate.user.js";

const userRoutes = Router();

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update user profile
 *     description: Updates the profile information of the authenticated user.
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
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Harshit
 *               lastName:
 *                 type: string
 *                 example: Kumar
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/avatar.jpg
 *
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
userRoutes.patch(
  "/profile",
  authenticateUser,
  validate(updateSchema),
  updateProfile,
);

/**
 * @swagger
 * /users/account:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user account
 *     description: Permanently deletes the authenticated user's account and removes all associated sessions.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     responses:
 *       200:
 *         description: Account deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
userRoutes.delete("/account", authenticateUser, deleteAccount);

/**
 * @swagger
 * /users/sessions:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get active sessions
 *     description: Retrieves all active sessions for the authenticated user.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     responses:
 *       200:
 *         description: Active sessions retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
userRoutes.get("/sessions", authenticateUser, getSessions);

/**
 * @swagger
 * /users/sessions/{sessionId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Revoke a specific session
 *     description: Revokes a specific active session of the authenticated user using the session ID.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the session to revoke.
 *
 *     responses:
 *       200:
 *         description: Session revoked successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Session or user not found.
 *       500:
 *         description: Internal server error.
 */
userRoutes.delete("/sessions/:sessionId", authenticateUser, revokeSession);

export default userRoutes;
