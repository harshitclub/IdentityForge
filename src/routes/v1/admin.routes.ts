import { Router } from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
} from "../../controllers/v1/admin.controller.js";

const router = Router();

/**
 * Admin Routes
 */
router.get("/users", getAllUsers);

router.get("/users/:id", getUserById);

router.patch("/users/:id/role", updateUserRole);

router.patch("/users/:id/status", updateUserStatus);

router.delete("/users/:id", deleteUser);

export default router;
