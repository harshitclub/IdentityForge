import { Router } from "express";
import {
  deleteAccount,
  getProfile,
  getSessions,
  revokeSession,
  updateAvatar,
  updateProfile,
} from "./user.controller.js";

const userRoutes = Router();

/**
 * User Routes
 */
userRoutes.get("/profile", getProfile);

userRoutes.patch("/profile", updateProfile);

userRoutes.delete("/account", deleteAccount);

userRoutes.get("/sessions", getSessions);

userRoutes.delete("/sessions/:sessionId", revokeSession);

export default userRoutes;
