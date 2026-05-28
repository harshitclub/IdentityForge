import { Router } from "express";
import {
  deleteAccount,
  getProfile,
  getSessions,
  revokeSession,
  updateAvatar,
  updateProfile,
} from "../../controllers/v1/user.controller.js";

const router = Router();

/**
 * User Routes
 */
router.get("/profile", getProfile);

router.patch("/profile", updateProfile);

router.patch("/avatar", updateAvatar);

router.delete("/account", deleteAccount);

router.get("/sessions", getSessions);

router.delete("/sessions/:sessionId", revokeSession);

export default router;
