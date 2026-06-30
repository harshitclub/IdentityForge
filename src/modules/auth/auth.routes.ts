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
 * Authentication Routes
 */
authRoutes.post("/signup", validate(registerSchema), signup);

authRoutes.post("/login", validate(loginSchema), login);

authRoutes.post("/logout", logout);

authRoutes.post("/refresh-token", refreshToken);

authRoutes.post("/verify-email", verifyEmail);

authRoutes.post("/resend-verification", authenticateUser, resendVerification);

authRoutes.post(
  "/forgot-password",
  validate(forgetPasswordSchema),
  forgotPassword,
);

authRoutes.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPassword,
);

authRoutes.post(
  "/change-password",
  authenticateUser,
  validate(changePasswordSchema),
  changePassword,
);

authRoutes.get("/me", authenticateUser, getMe);

authRoutes.post("/revoke-all-sessions", authenticateUser, revokeAllSessions);

export default authRoutes;
