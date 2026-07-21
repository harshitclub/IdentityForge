export const LOG_EVENTS = {
  /**
   * ===================================
   * Request Lifecycle
   * ===================================
   */
  REQUEST_STARTED: "REQUEST_STARTED",
  REQUEST_COMPLETED: "REQUEST_COMPLETED",
  REQUEST_FAILED: "REQUEST_FAILED",
  REQUEST_ABORTED: "REQUEST_ABORTED",

  /**
   * ===================================
   * Validation
   * ===================================
   */
  VALIDATION_PASSED: "VALIDATION_PASSED",
  VALIDATION_FAILED: "VALIDATION_FAILED",

  /**
   * ===================================
   * User Registration
   * ===================================
   */
  USER_REGISTERED: "USER_REGISTERED",
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",

  /**
   * ===================================
   * Authentication
   * ===================================
   */
  USER_LOGIN_SUCCESS: "USER_LOGIN_SUCCESS",
  USER_LOGIN_FAILED: "USER_LOGIN_FAILED",
  USER_LOGOUT: "USER_LOGOUT",

  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  ACCOUNT_BANNED: "ACCOUNT_BANNED",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",

  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",

  /**
   * ===================================
   * Authentication
   * ===================================
   */
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  /**
   * ===================================
   * Access Token
   * ===================================
   */
  ACCESS_TOKEN_GENERATED: "ACCESS_TOKEN_GENERATED",
  ACCESS_TOKEN_EXPIRED: "ACCESS_TOKEN_EXPIRED",
  ACCESS_TOKEN_INVALID: "ACCESS_TOKEN_INVALID",
  ACCESS_TOKEN_VERIFICATION_ERROR: "ACCESS_TOKEN_VERIFICATION_ERROR",

  /**
   * ===================================
   * Refresh Token
   * ===================================
   */
  REFRESH_TOKEN_GENERATED: "REFRESH_TOKEN_GENERATED",
  REFRESH_TOKEN_ROTATED: "REFRESH_TOKEN_ROTATED",
  REFRESH_TOKEN_REVOKED: "REFRESH_TOKEN_REVOKED",

  REFRESH_TOKEN_EXPIRED: "REFRESH_TOKEN_EXPIRED",
  REFRESH_TOKEN_INVALID: "REFRESH_TOKEN_INVALID",
  REFRESH_TOKEN_VERIFICATION_ERROR: "REFRESH_TOKEN_VERIFICATION_ERROR",
  REFRESH_TOKEN_DECODE_FAILED: "REFRESH_TOKEN_DECODE_FAILED",

  /**
   * ===================================
   * Email Verification
   * ===================================
   */
  EMAIL_VERIFICATION_TOKEN_CREATED: "EMAIL_VERIFICATION_TOKEN_CREATED",
  EMAIL_VERIFICATION_SENT: "EMAIL_VERIFICATION_SENT",
  EMAIL_VERIFIED: "EMAIL_VERIFIED",
  EMAIL_VERIFICATION_TOKEN_EXPIRED: "EMAIL_VERIFICATION_TOKEN_EXPIRED",
  EMAIL_VERIFICATION_TOKEN_INVALID: "EMAIL_VERIFICATION_TOKEN_INVALID",

  /**
   * ===================================
   * Password Reset
   * ===================================
   */
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_TOKEN_CREATED: "PASSWORD_RESET_TOKEN_CREATED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET_TOKEN_EXPIRED: "PASSWORD_RESET_TOKEN_EXPIRED",
  PASSWORD_RESET_TOKEN_INVALID: "PASSWORD_RESET_TOKEN_INVALID",

  /**
   * ===================================
   * Sessions
   * ===================================
   */
  SESSION_CREATED: "SESSION_CREATED",
  SESSION_REVOKED: "SESSION_REVOKED",
  ALL_SESSIONS_REVOKED: "ALL_SESSIONS_REVOKED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",

  /**
   * ===================================
   * User Profile
   * ===================================
   */
  PROFILE_UPDATED: "PROFILE_UPDATED",
  ACCOUNT_SOFT_DELETED: "ACCOUNT_SOFT_DELETED",

  /**
   * ===================================
   * Authorization
   * ===================================
   */
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  FORBIDDEN_ACCESS: "FORBIDDEN_ACCESS",
  ADMIN_ACTION_PERFORMED: "ADMIN_ACTION_PERFORMED",

  /**
   * ===================================
   * Database
   * ===================================
   */
  DATABASE_OPERATION_FAILED: "DATABASE_OPERATION_FAILED",
  DATABASE_TRANSACTION_STARTED: "DATABASE_TRANSACTION_STARTED",
  DATABASE_TRANSACTION_COMMITTED: "DATABASE_TRANSACTION_COMMITTED",
  DATABASE_TRANSACTION_ROLLED_BACK: "DATABASE_TRANSACTION_ROLLED_BACK",

  /**
   * ===================================
   * Redis / Cache
   * ===================================
   */
  REDIS_CONNECTED: "REDIS_CONNECTED",
  REDIS_READY: "REDIS_READY",
  REDIS_CONNECTION_CLOSED: "REDIS_CONNECTION_CLOSED",
  REDIS_ERROR: "REDIS_ERROR",

  CACHE_HIT: "CACHE_HIT",
  CACHE_MISS: "CACHE_MISS",
  CACHE_SET: "CACHE_SET",
  CACHE_DELETED: "CACHE_DELETED",

  /**
   * ===================================
   * BullMQ
   * ===================================
   */
  JOB_QUEUED: "JOB_QUEUED",
  JOB_STARTED: "JOB_STARTED",
  JOB_COMPLETED: "JOB_COMPLETED",
  JOB_FAILED: "JOB_FAILED",
  JOB_RETRIED: "JOB_RETRIED",
  JOB_REMOVED: "JOB_REMOVED",
  JOB_PROCESSING: "JOB_PROCESSING",
  WORKER_SHUTDOWN: "WORKER_SHUTDOWN",

  /**
   * ===================================
   * Email Jobs
   * ===================================
   */
  EMAIL_JOB_QUEUED: "EMAIL_JOB_QUEUED",
  EMAIL_JOB_COMPLETED: "EMAIL_JOB_COMPLETED",
  EMAIL_JOB_FAILED: "EMAIL_JOB_FAILED",

  /**
   * ===================================
   * SMTP / Email
   * ===================================
   */
  SMTP_READY: "SMTP_READY",
  SMTP_CONNECTION_FAILED: "SMTP_CONNECTION_FAILED",

  EMAIL_SENDING: "EMAIL_SENDING",

  EMAIL_QUEUED: "EMAIL_QUEUED",
  EMAIL_SENT: "EMAIL_SENT",
  EMAIL_SEND_FAILED: "EMAIL_SEND_FAILED",

  /**
   * ===================================
   * Security
   * ===================================
   */
  SECURITY_EVENT: "SECURITY_EVENT",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  TOKEN_REUSE_DETECTED: "TOKEN_REUSE_DETECTED",
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  CSRF_VALIDATION_FAILED: "CSRF_VALIDATION_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  /**
   * ===================================
   * Monitoring
   * ===================================
   */
  HEALTH_CHECK_SUCCESS: "HEALTH_CHECK_SUCCESS",
  HEALTH_CHECK_FAILED: "HEALTH_CHECK_FAILED",

  /**
   * ===================================
   * Server
   * ===================================
   */

  /**
   * ===================================
   * Unexpected Errors
   * ===================================
   */
  UNHANDLED_EXCEPTION: "UNHANDLED_EXCEPTION",
  UNHANDLED_REJECTION: "UNHANDLED_REJECTION",
  UNCAUGHT_EXCEPTION: "UNCAUGHT_EXCEPTION",
  OPERATIONAL_ERROR: "OPERATIONAL_ERROR",
  SERVER_STARTED: "SERVER_STARTED",
  SERVER_ADDRESS: "SERVER_ADDRESS",

  SHUTDOWN_STARTED: "SHUTDOWN_STARTED",
  SHUTDOWN_COMPLETED: "SHUTDOWN_COMPLETED",
  SHUTDOWN_FAILED: "SHUTDOWN_FAILED",
  FORCED_SHUTDOWN: "FORCED_SHUTDOWN",
} as const;

export type LogEvent = (typeof LOG_EVENTS)[keyof typeof LOG_EVENTS];
