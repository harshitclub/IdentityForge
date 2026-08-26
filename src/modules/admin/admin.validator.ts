import z from "zod";

/**
 * ============================================================================
 * Admin Request Validation Schemas (Zod)
 * ============================================================================
 * Strict input validation schemas for administrative mutations.
 */

/**
 * Validates role update payload.
 * Constraints:
 * - role: "USER" | "ADMIN"
 */
export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

/**
 * Validates status update payload.
 * Constraints:
 * - status: "ACTIVE" | "SUSPENDED" | "BANNED"
 */
export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
});
