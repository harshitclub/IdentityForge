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
} from "../../controllers/v1/auth.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { registerSchema } from "../../validators/auth.validator.js";

const router = Router();

/**
 * Authentication Routes
 */
router.post("/signup", validate(registerSchema), signup);

router.post("/login", login);

router.post("/logout", logout);

router.post("/refresh-token", refreshToken);

router.post("/verify-email", verifyEmail);

router.post("/resend-verification", resendVerification);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.post("/change-password", changePassword);

router.get("/me", getMe);

router.post("/revoke-all-sessions", revokeAllSessions);

export default router;
