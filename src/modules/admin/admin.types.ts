import type { AccountStatus, UserRole } from "../../generated/prisma/enums.js";

/**
 * ============================================================================
 * Admin Module Type Definitions & DTOs
 * ============================================================================
 * Data contracts for administrative operations including paginated user queries,
 * role assignments, and account status modifications.
 */

/**
 * Pagination query parameters for listing users.
 */
export type PaginationDto = {
  page: number;
  limit: number;
};

/**
 * Data payload for updating user authorization role.
 */
export type UpdateUserRoleDto = {
  role: UserRole;
};

/**
 * Data payload for updating user account status (ACTIVE, SUSPENDED, BANNED).
 */
export type UpdateUserStatusDto = {
  status: AccountStatus;
};
