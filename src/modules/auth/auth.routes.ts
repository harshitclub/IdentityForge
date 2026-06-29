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
  loginSchema,
  registerSchema,
} from "./auth.validator.js";
import { authenticateUser } from "../../shared/middlewares/authenticate.user.js";

const authRoutes = Router();

/**
 * Authentication Routes
 */
authRoutes.post("/signup", validate(registerSchema), signup);

authRoutes.post("/login", validate(loginSchema), login);

authRoutes.post("/logout", logout);

authRoutes.post("/refresh-token", refreshToken);

authRoutes.post("/verify-email", verifyEmail);

authRoutes.post("/resend-verification", resendVerification);

authRoutes.post("/forgot-password", forgotPassword);

authRoutes.post("/reset-password", resetPassword);

authRoutes.post(
  "/change-password",
  authenticateUser,
  validate(changePasswordSchema),
  changePassword,
);

authRoutes.get("/me", authenticateUser, getMe);

authRoutes.post("/revoke-all-sessions", revokeAllSessions);

export default authRoutes;
