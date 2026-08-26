import { z } from "zod";

/**
 * ============================================================================
 * Auth Request Validation Schemas (Zod)
 * ============================================================================
 * Strict input sanitization and constraint validation rules for all incoming
 * authentication payloads.
 */

/**
 * Validates user registration payload.
 * Constraints:
 * - firstName: min 3, max 100 chars
 * - lastName: min 3, max 100 chars
 * - email: standard email format
 * - password: min 8, max 32 chars
 * - role: optional ("user" | "admin")
 */
export const registerSchema = z.object({
  firstName: z
    .string()
    .min(3, "First name must be at least 3 characters")
    .max(100, "First name cannot exceed 100 characters"),
  lastName: z
    .string()
    .min(3, "Last name must be at least 3 characters")
    .max(100, "Last name cannot exceed 100 characters"),

  email: z.email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password cannot exceed 32 characters"),

  role: z.enum(["user", "admin"]).optional(),
});

/**
 * Validates user login payload.
 * Constraints:
 * - email: valid email format
 * - password: required non-empty string
 */
export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Validates password change for authenticated users.
 * Constraints:
 * - currentPassword: required string
 * - newPassword: min 8, max 32 chars
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password cannot exceed 32 characters"),
});

/**
 * Validates forgot password request payload.
 * Constraints:
 * - email: valid email format
 */
export const forgetPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

/**
 * Validates reset password payload using reset token.
 * Constraints:
 * - newPassword: min 8, max 32 chars
 */
export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password cannot exceed 32 characters"),
});
