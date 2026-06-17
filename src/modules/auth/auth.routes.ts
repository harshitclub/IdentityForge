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
import { registerSchema } from "./auth.validator.js";

const authRoutes = Router();

/**
 * Authentication Routes
 */
authRoutes.post("/signup", validate(registerSchema), signup);

authRoutes.post("/login", login);

authRoutes.post("/logout", logout);

authRoutes.post("/refresh-token", refreshToken);

authRoutes.post("/verify-email", verifyEmail);

authRoutes.post("/resend-verification", resendVerification);

authRoutes.post("/forgot-password", forgotPassword);

authRoutes.post("/reset-password", resetPassword);

authRoutes.post("/change-password", changePassword);

authRoutes.get("/me", getMe);

authRoutes.post("/revoke-all-sessions", revokeAllSessions);

export default authRoutes;
