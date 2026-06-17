import { Router } from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
} from "./admin.controller.js";

const adminRoutes = Router();

/**
 * Admin Routes
 */
adminRoutes.get("/users", getAllUsers);

adminRoutes.get("/users/:id", getUserById);

adminRoutes.patch("/users/:id/role", updateUserRole);

adminRoutes.patch("/users/:id/status", updateUserStatus);

adminRoutes.delete("/users/:id", deleteUser);

export default adminRoutes;
