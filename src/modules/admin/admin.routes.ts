import { Router } from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
} from "./admin.controller.js";
import { authenticateUser } from "../../shared/middlewares/authenticate.user.js";
import { authenticateAdmin } from "../../shared/middlewares/authenticate.admin.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "./admin.validator.js";

const adminRoutes = Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all users
 *     description: Retrieves a list of all registered users. Accessible only to administrators.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     responses:
 *       200:
 *         description: Users retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Admin access required.
 *       500:
 *         description: Internal server error.
 */
adminRoutes.get("/users", authenticateUser, authenticateAdmin, getAllUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get user by ID
 *     description: Retrieves the details of a specific user by their ID. Accessible only to administrators.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *
 *     responses:
 *       200:
 *         description: User retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Admin access required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
adminRoutes.get("/users/:id", authenticateUser, authenticateAdmin, getUserById);

/**
 * @swagger
 * /admin/users/{id}/role:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Update user role
 *     description: Updates the role of a specific user. Accessible only to administrators.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 example: admin
 *
 *     responses:
 *       200:
 *         description: User role updated successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Admin access required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
adminRoutes.patch(
  "/users/:id/role",
  authenticateUser,
  authenticateAdmin,
  validate(updateUserRoleSchema),
  updateUserRole,
);

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Update user status
 *     description: Updates the status of a specific user account. Accessible only to administrators.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 example: active
 *
 *     responses:
 *       200:
 *         description: User status updated successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Admin access required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
adminRoutes.patch(
  "/users/:id/status",
  authenticateUser,
  authenticateAdmin,
  validate(updateUserStatusSchema),
  updateUserStatus,
);

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete user
 *     description: Permanently deletes a specific user account. Accessible only to administrators.
 *
 *     security:
 *       - AccessCookie: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden. Admin access required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
adminRoutes.delete(
  "/users/:id",
  authenticateUser,
  authenticateAdmin,
  deleteUser,
);

export default adminRoutes;
