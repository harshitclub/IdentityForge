/**
 * ============================================================================
 * User Module Type Definitions & DTOs
 * ============================================================================
 * Data contracts for user self-service operations including profile edits.
 */

/**
 * Data payload for modifying user profile attributes.
 */
export type UpdateProfileDto = {
  firstName?: string;
  lastName?: string;
  username?: string;
};
