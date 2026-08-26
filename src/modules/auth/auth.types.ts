/**
 * ============================================================================
 * Auth Module Type Definitions & DTOs
 * ============================================================================
 * Data Transfer Objects (DTOs) and metadata contracts for authentication
 * operations including registration, login, password management, and sessions.
 */

/**
 * Data payload required to register a new user account.
 */
export type SignupDto = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

/**
 * Data payload required to authenticate an existing user.
 */
export type LoginDto = {
  email: string;
  password: string;
};

/**
 * Client device & network metadata extracted from request headers for session tracking.
 */
export type SessionMetadata = {
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
};

/**
 * Data payload for requesting a password reset email.
 */
export type ForgotPasswordDto = {
  email: string;
};

/**
 * Data payload for resetting a password using a one-time token.
 */
export type ResetPasswordDto = {
  newPassword: string;
};

/**
 * Data payload for changing password when authenticated.
 */
export type ChangePasswordDto = {
  currentPassword: string;
  newPassword: string;
};
