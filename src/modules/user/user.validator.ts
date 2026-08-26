import { z } from "zod";

/**
 * ============================================================================
 * User Request Validation Schemas (Zod)
 * ============================================================================
 * Strict input validation schemas for user self-service operations.
 */

/**
 * Validates user profile update payload.
 * Constraints:
 * - firstName: optional, min 3, max 100 chars
 * - lastName: optional, min 3, max 100 chars
 * - username: optional, min 3, max 50 chars, alphanumeric + underscore only
 * - refine: at least one field must be provided
 */
export const updateSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(3, "First name must be at least 3 characters")
      .max(100, "First name cannot exceed 100 characters")
      .optional(),

    lastName: z
      .string()
      .trim()
      .min(3, "Last name must be at least 3 characters")
      .max(100, "Last name cannot exceed 100 characters")
      .optional(),

    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username cannot exceed 50 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
