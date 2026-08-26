import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { cacheRedis } from "../../config/redis.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../constants/index.js";
import { EMAIL_JOBS } from "../../constants/jobs/jobs.js";
import { emailQueue } from "../../jobs/queues/email.queue.js";
import { getRequestLogger } from "../../shared/request-context/request-context.js";
import { AppError } from "../../shared/utils/appError.js";
import { generateAccessToken } from "../../shared/utils/auth/accessToken.js";
import {
  comparePassword,
  hashPassword,
} from "../../shared/utils/auth/password.js";
import {
  generateRefreshTokenWithJti,
  verifyRefreshToken,
} from "../../shared/utils/auth/refreshToken.js";
import { generateResetPasswordTokenRaw } from "../../shared/utils/auth/resetPasswordToken.js";
import { sha256Hex } from "../../shared/utils/auth/sha256Hex.js";
import { generateVerificationTokenRaw } from "../../shared/utils/auth/verificationToken.js";
import { maskEmail } from "../../shared/utils/mask.js";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  SessionMetadata,
  SignupDto,
} from "./auth.types.js";

/**
 * ============================================================================
 * AuthService
 * ============================================================================
 * Core business logic for user authentication, registration, session management,
 * token rotation, brute-force protection, and password reset workflows.
 */
class AuthService {
  /**
   * --------------------------------------------------------------------------
   * 1. Signup Flow
   * --------------------------------------------------------------------------
   * Registers a new user account, creates a SHA-256 hashed verification token,
   * and enqueues an email verification job in BullMQ.
   *
   * @param data - User registration payload (firstName, lastName, email, password)
   */
  async signup(data: SignupDto) {
    const logger = getRequestLogger();
    const { firstName, lastName, email, password } = data;

    logger.info({
      event: LOG_EVENTS.SIGNUP_STARTED,
      email: maskEmail(email),
    });

    // Step 1: Check if an account already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      logger.warn({
        event: LOG_EVENTS.SIGNUP_BLOCKED,
        reason: "USER_ALREADY_EXISTS",
        email: maskEmail(email),
      });
      throw new AppError(
        ERROR_MESSAGES.USER_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT,
      );
    }

    // Step 2: Hash user password with Bcrypt (10 salt rounds)
    const hashedPassword = await hashPassword(password);

    // Step 3: Generate a 15-minute raw verification token & compute its SHA-256 hash
    const { raw: rawToken, expiresAt } = generateVerificationTokenRaw(15);
    const tokenHash = sha256Hex(rawToken);

    // Step 4: Atomically create User record and EmailVerificationToken in a single transaction
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash,
          expiresAt,
        },
      });

      return createdUser;
    });

    logger.info({
      event: LOG_EVENTS.USER_REGISTERED,
      userId: user.id,
    });

    // Step 5: Enqueue verification email job for background BullMQ worker
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

    await emailQueue.add(EMAIL_JOBS.VERIFICATION, {
      email: user.email,
      firstName: user.firstName ?? "User",
      verificationUrl,
    });

    logger.info({
      event: LOG_EVENTS.EMAIL_VERIFICATION_QUEUED,
      userId: user.id,
    });

    logger.info({
      event: LOG_EVENTS.SIGNUP_COMPLETED,
      userId: user.id,
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 2. Login Flow
   * --------------------------------------------------------------------------
   * Authenticates user credentials, enforces lockout and account status rules,
   * increments failed login attempts on failure, and creates Session & RefreshToken on success.
   *
   * @param data - User login credentials (email, password)
   * @param sessionMetadata - Parsed device, browser, OS, and IP metadata
   * @returns Tokens (access & refresh) and safe user profile data
   */
  async login(data: LoginDto, sessionMetadata: SessionMetadata) {
    const logger = getRequestLogger();
    const { email, password } = data;

    logger.info({
      event: LOG_EVENTS.LOGIN_STARTED,
      email: maskEmail(email),
    });

    const now = new Date();

    // Step 1: Look up user account
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        password: true,
        failedLoginAttempts: true,
        lockUntil: true,
        deletedAt: true,
        status: true,
      },
    });

    // Prevent user enumeration with generic credentials error
    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    // Step 2: Enforce status lifecycle restrictions
    if (user.status === "DELETED") {
      logger.warn({
        event: LOG_EVENTS.ACCOUNT_DELETED,
        reason: "ACCOUNT_DELETED",
        userId: user.id,
      });
      throw new AppError(ERROR_MESSAGES.ACCOUNT_DELETED, HTTP_STATUS.FORBIDDEN);
    }

    if (user.status === "SUSPENDED") {
      logger.warn({
        event: LOG_EVENTS.ACCOUNT_SUSPENDED,
        reason: "ACCOUNT_SUSPENDED",
        userId: user.id,
      });
      throw new AppError(
        ERROR_MESSAGES.ACCOUNT_SUSPENDED,
        HTTP_STATUS.FORBIDDEN,
      );
    }

    if (user.status === "BANNED") {
      logger.warn({
        event: LOG_EVENTS.ACCOUNT_BANNED,
        reason: "ACCOUNT_BANNED",
        userId: user.id,
      });
      throw new AppError(ERROR_MESSAGES.ACCOUNT_BANNED, HTTP_STATUS.FORBIDDEN);
    }

    // Step 3: Check if account is temporarily locked out
    if (user.lockUntil && user.lockUntil > now) {
      logger.warn({
        event: LOG_EVENTS.ACCOUNT_LOCKED,
        reason: "ACCOUNT_LOCKED",
        userId: user.id,
      });
      throw new AppError(ERROR_MESSAGES.ACCOUNT_LOCKED, HTTP_STATUS.FORBIDDEN);
    }

    // Step 4: Verify password hash
    const isPasswordValid = await comparePassword(password, user.password!);

    if (!isPasswordValid) {
      // Increment failed attempt counter
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
        select: {
          failedLoginAttempts: true,
        },
      });

      logger.warn({
        event: LOG_EVENTS.USER_LOGIN_FAILED,
        reason: "INVALID_PASSWORD",
        userId: user.id,
      });

      // Trigger temporary account lock if threshold is exceeded
      if (updatedUser.failedLoginAttempts >= env.MAX_FAILED_LOGIN) {
        const lockUntil = new Date(
          Date.now() + env.ACCOUNT_LOCK_DURATION * 60 * 1000,
        );

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lockUntil,
          },
        });

        logger.warn({
          event: LOG_EVENTS.ACCOUNT_LOCKED,
          userId: user.id,
        });

        throw new AppError(
          ERROR_MESSAGES.ACCOUNT_LOCKED,
          HTTP_STATUS.FORBIDDEN,
        );
      }

      throw new AppError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    // Step 5: Issue Access Token (short-lived JWT)
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Step 6: Issue Refresh Token with cryptographic JTI (UUID)
    const { token: refreshToken, jti } = generateRefreshTokenWithJti({
      id: user.id,
    });

    const refreshJtiHash = sha256Hex(jti);
    const refreshExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN);

    // Step 7: Atomically create Session, link RefreshToken, and reset failed attempts
    await prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          userId: user.id,
          ...sessionMetadata,
          isCurrent: true,
          expiresAt: refreshExpiresAt,
        },
      });

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          tokenHash: refreshJtiHash,
          expiresAt: refreshExpiresAt,
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginAttempts: 0,
          lockUntil: null,
          lastLoginAt: now,
        },
      });
    });

    logger.info({
      event: LOG_EVENTS.USER_LOGIN_SUCCESS,
      userId: user.id,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * --------------------------------------------------------------------------
   * 3. Logout Flow
   * --------------------------------------------------------------------------
   * Invalidates the user's refresh token and active sessions, and deletes cached profile.
   * Silently swallows token errors so client logout always completes.
   *
   * @param refreshToken - Raw refresh token from client cookies
   */
  async logout(refreshToken?: string) {
    const logger = getRequestLogger();

    if (!refreshToken) {
      return;
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      const refreshJtiHash = sha256Hex(payload.jti!);

      await prisma.$transaction(async (tx) => {
        await tx.refreshToken.deleteMany({
          where: {
            tokenHash: refreshJtiHash,
          },
        });

        await tx.session.deleteMany({
          where: {
            userId: payload.id,
          },
        });
      });

      // Invalidate cached user profile in Redis
      await cacheRedis.del(`user:${payload.id}`);

      logger.info({
        event: LOG_EVENTS.LOGOUT_SUCCESS,
        userId: payload.id,
      });
    } catch {
      // Ignore expired/invalid tokens - client cookie removal is sufficient
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 4. Refresh Token Rotation (RTR)
   * --------------------------------------------------------------------------
   * Rotates a refresh token by verifying the JWT signature, validating the JTI
   * hash against the database, revoking the old token, and issuing a new token pair.
   *
   * @param refreshToken - Raw refresh token from client cookies
   * @returns New access and refresh token pair
   */
  async refreshToken(refreshToken: string) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.TOKEN_REFRESH_STARTED,
    });

    // Step 1: Verify token signature and expiration
    const tokenPayload = verifyRefreshToken(refreshToken);
    const refreshJtiHash = sha256Hex(tokenPayload.jti!);

    // Step 2: Query database for stored token record
    const storedRefreshToken = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: refreshJtiHash,
      },
      select: {
        id: true,
        userId: true,
        sessionId: true,
        expiresAt: true,
      },
    });

    if (!storedRefreshToken) {
      logger.warn({
        event: LOG_EVENTS.REFRESH_TOKEN_REVOKED,
        userId: tokenPayload.id,
      });

      throw new AppError(
        ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    if (storedRefreshToken.expiresAt < new Date()) {
      throw new AppError(
        ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    // Step 3: Fetch user profile
    const user = await prisma.user.findUnique({
      where: {
        id: tokenPayload.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Step 4: Issue newly rotated access & refresh tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { token: newRefreshToken, jti } = generateRefreshTokenWithJti({
      id: user.id,
    });

    const newRefreshJtiHash = sha256Hex(jti);
    const refreshExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN);

    // Step 5: Atomically swap old token for new token & update session lastUsedAt
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({
        where: {
          tokenHash: refreshJtiHash,
        },
      });

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          sessionId: storedRefreshToken.sessionId,
          tokenHash: newRefreshJtiHash,
          expiresAt: refreshExpiresAt,
        },
      });

      await tx.session.update({
        where: {
          id: storedRefreshToken.sessionId,
        },
        data: {
          lastUsedAt: new Date(),
        },
      });
    });

    logger.info({
      event: LOG_EVENTS.REFRESH_TOKEN_GENERATED,
      userId: user.id,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * 5. Verify Email Flow
   * --------------------------------------------------------------------------
   * Validates one-time verification token, updates user to ACTIVE, and purges token.
   *
   * @param token - Raw verification token from email query parameter
   */
  async verifyEmail(token: string) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.EMAIL_VERIFICATION_STARTED,
    });

    const tokenHash = sha256Hex(token);

    // Step 1: Look up token in database
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            isEmailVerified: true,
          },
        },
      },
    });

    if (!verificationToken) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new AppError(ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    if (verificationToken.user.isEmailVerified) {
      throw new AppError(
        ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED,
        HTTP_STATUS.CONFLICT,
      );
    }

    // Step 2: Atomically mark user as verified and delete one-time token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: verificationToken.user.id,
        },
        data: {
          isEmailVerified: true,
          status: "ACTIVE",
        },
      });

      await tx.emailVerificationToken.delete({
        where: {
          id: verificationToken.id,
        },
      });
    });

    logger.info({
      event: LOG_EVENTS.EMAIL_VERIFIED,
      userId: verificationToken.user.id,
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 6. Resend Verification Email Flow
   * --------------------------------------------------------------------------
   * Cleans up any prior verification tokens for user and sends a fresh 15-minute token.
   *
   * @param userId - ID of authenticated user
   */
  async resendVerification(userId: string) {
    const logger = getRequestLogger();
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.isEmailVerified) {
      throw new AppError(
        ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED,
        HTTP_STATUS.CONFLICT,
      );
    }

    // Remove any previous pending verification tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Generate new verification token (15 min TTL)
    const { raw: rawToken, expiresAt } = generateVerificationTokenRaw(15);
    const tokenHash = sha256Hex(rawToken);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

    await emailQueue.add(EMAIL_JOBS.VERIFICATION, {
      email: user.email,
      firstName: user.firstName ?? "User",
      verificationUrl,
    });

    logger.info({
      event: LOG_EVENTS.EMAIL_VERIFICATION_QUEUED,
      userId: user.id,
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 7. Forgot Password Flow
   * --------------------------------------------------------------------------
   * Initiates password reset by creating a one-time token and enqueuing an email.
   * Returns silently if user does not exist to prevent account enumeration.
   *
   * @param data - Forgot password DTO containing email address
   */
  async forgotPassword(data: ForgotPasswordDto) {
    const logger = getRequestLogger();
    const { email } = data;

    logger.info({
      event: LOG_EVENTS.PASSWORD_RESET_REQUESTED,
      email: maskEmail(email),
    });

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Prevent user enumeration
    if (!user) {
      return;
    }

    // Invalidate previous unused reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Generate new raw reset token & save SHA-256 hash
    const { raw: resetPasswordToken, expiresAt } =
      generateResetPasswordTokenRaw();

    const hashedResetPasswordToken = sha256Hex(resetPasswordToken);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedResetPasswordToken,
        expiresAt,
      },
    });

    const resetPasswordUrl = `${env.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;

    await emailQueue.add(EMAIL_JOBS.RESET_PASSWORD, {
      email: user.email,
      resetPasswordUrl,
    });

    logger.info({
      event: LOG_EVENTS.PASSWORD_RESET_EMAIL_QUEUED,
      userId: user.id,
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 8. Reset Password Flow
   * --------------------------------------------------------------------------
   * Validates reset token, verifies new password difference, updates password,
   * marks token as used, revokes all sessions, and invalidates user cache.
   *
   * @param token - Raw reset token from email URL
   * @param data - New password payload
   */
  async resetPassword(token: string, data: ResetPasswordDto) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.PASSWORD_RESET_STARTED,
    });

    const { newPassword } = data;
    const tokenHash = sha256Hex(token);

    // Step 1: Look up token in database
    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            password: true,
          },
        },
      },
    });

    if (!passwordResetToken) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
    }

    if (passwordResetToken.usedAt) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST);
    }

    if (passwordResetToken.expiresAt < new Date()) {
      throw new AppError(ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    // Step 2: Prevent reusing the current password
    const isSamePassword = await comparePassword(
      newPassword,
      passwordResetToken.user.password!,
    );

    if (isSamePassword) {
      throw new AppError(ERROR_MESSAGES.SAME_PASSWORD, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(newPassword);

    // Step 3: Atomically update password, mark token used, and purge all active sessions
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: passwordResetToken.user.id,
        },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });

      await tx.passwordResetToken.update({
        where: {
          id: passwordResetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.refreshToken.deleteMany({
        where: {
          userId: passwordResetToken.user.id,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId: passwordResetToken.user.id,
        },
      });
    });

    // Invalidate cached user profile in Redis
    await cacheRedis.del(`user:${passwordResetToken.user.id}`);

    logger.info({
      event: LOG_EVENTS.PASSWORD_RESET_COMPLETED,
      userId: passwordResetToken.user.id,
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 9. Change Password Flow
   * --------------------------------------------------------------------------
   * Verifies current password, checks new password difference, updates password,
   * revokes all sessions across devices, and invalidates user cache.
   *
   * @param userId - ID of authenticated user
   * @param data - Current and new password payload
   */
  async changePassword(userId: string, data: ChangePasswordDto) {
    const logger = getRequestLogger();
    logger.info({
      event: LOG_EVENTS.PASSWORD_CHANGE_STARTED,
      userId,
    });

    const { currentPassword, newPassword } = data;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Step 1: Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password!,
    );

    if (!isPasswordValid) {
      throw new AppError(
        ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Step 2: Prevent reusing existing password
    const isSamePassword = await comparePassword(newPassword, user.password!);

    if (isSamePassword) {
      throw new AppError(ERROR_MESSAGES.SAME_PASSWORD, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(newPassword);

    // Step 3: Atomically update password and log out all active sessions
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
        },
      });

      await tx.refreshToken.deleteMany({
        where: {
          userId: user.id,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId: user.id,
        },
      });
    });

    // Invalidate cached user profile in Redis
    await cacheRedis.del(`user:${user.id}`);

    logger.info({
      event: LOG_EVENTS.PASSWORD_CHANGED,
      userId,
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 10. Get Current User Profile (Cache-Aside Pattern)
   * --------------------------------------------------------------------------
   * Fetches user profile from Redis cache first; on cache miss queries database
   * and populates Redis cache with a 5-minute TTL.
   *
   * @param userId - ID of authenticated user
   * @returns User profile data and cached status flag
   */
  async getMe(userId: string) {
    const logger = getRequestLogger();
    const cacheKey = `user:${userId}`;

    // Step 1: Check Redis cache
    const cachedUser = await cacheRedis.get(cacheKey);

    if (cachedUser) {
      logger.info({
        event: LOG_EVENTS.CACHE_HIT,
        cacheKey,
      });
      return {
        user: JSON.parse(cachedUser),
        cached: true,
      };
    }

    // Step 2: Query database on cache miss with safe field projection
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Step 3: Populate Redis cache with 5-minute TTL (300 seconds)
    await cacheRedis.set(cacheKey, JSON.stringify(user), "EX", 60 * 5);

    logger.info({
      event: LOG_EVENTS.CACHE_MISS,
      cacheKey,
    });

    return {
      user,
      cached: false,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * 11. Revoke All Sessions Flow
   * --------------------------------------------------------------------------
   * Atomically deletes all active RefreshToken and Session records for the user
   * and purges the cached profile from Redis.
   *
   * @param userId - ID of authenticated user
   */
  async revokeAllSessions(userId: string) {
    const logger = getRequestLogger();

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({
        where: {
          userId,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId,
        },
      });
    });

    // Invalidate cached user profile in Redis
    await cacheRedis.del(`user:${userId}`);

    logger.info({
      event: LOG_EVENTS.ALL_SESSIONS_REVOKED,
      userId,
    });
  }
}

export const authService = new AuthService();
