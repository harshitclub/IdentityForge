import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { cacheRedis } from "../../config/redis.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../constants/index.js";
import { EMAIL_JOBS } from "../../constants/jobs/jobs.js";
import { emailQueue } from "../../jobs/queues/email.queue.js";
import { logger } from "../../shared/logging/logger.js";
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

class AuthService {
  async signup(data: SignupDto) {
    const { firstName, lastName, email, password } = data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      logger.warn(
        `Signup blocked: Email already exists | email=${maskEmail(email)}`,
      );
      throw new AppError(
        ERROR_MESSAGES.USER_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT,
      );
    }

    const hashedPassword = await hashPassword(password);

    const { raw: rawToken, expiresAt } = generateVerificationTokenRaw(15);
    const tokenHash = sha256Hex(rawToken);

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

    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

    await emailQueue.add(EMAIL_JOBS.VERIFICATION, {
      email: user.email,
      firstName: user.firstName ?? "User",
      verificationUrl,
    });

    logger.info(`Verification email job queued for ${user.email}`);
  }

  async login(data: LoginDto, sessionMetadata: SessionMetadata) {
    const { email, password } = data;
    const now = new Date();

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

    // Generic error
    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    // Account has been deleted
    if (user.status === "DELETED") {
      logger.warn(`Login blocked: Deleted account | userId=${user.id}`);

      throw new AppError(ERROR_MESSAGES.ACCOUNT_DELETED, HTTP_STATUS.FORBIDDEN);
    }

    // Account is currently locked
    if (user.lockUntil && user.lockUntil > now) {
      logger.warn(`Login blocked: Account locked | userId=${user.id}`);

      throw new AppError(ERROR_MESSAGES.ACCOUNT_LOCKED, HTTP_STATUS.FORBIDDEN);
    }

    // Password verification
    const isPasswordValid = await comparePassword(password, user.password!);

    if (!isPasswordValid) {
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

        logger.warn(`Account locked | userId=${user.id}`);

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

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { token: refreshToken, jti } = generateRefreshTokenWithJti({
      id: user.id,
    });

    const refreshJtiHash = sha256Hex(jti);
    const refreshExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN);

    await prisma.$transaction(async (tx) => {
      // Create Session
      const session = await tx.session.create({
        data: {
          userId: user.id,
          ...sessionMetadata,
          isCurrent: true,
          expiresAt: refreshExpiresAt,
        },
      });

      // Create Refresh Token linked to Session
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          tokenHash: refreshJtiHash,
          expiresAt: refreshExpiresAt,
        },
      });

      // Reset login attempts
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

  async logout(refreshToken?: string) {
    // No refresh token? Logout is still successful.
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

      // Invalidate cached profile
      await cacheRedis.del(`user:${payload.id}`);

      logger.info(`User logged out | userId=${payload.id}`);
    } catch {
      // Ignore invalid/expired refresh tokens.
      // Logout should always succeed from the client's perspective.
    }
  }

  async refreshToken(refreshToken: string) {
    const tokenPayload = verifyRefreshToken(refreshToken);

    const refreshJtiHash = sha256Hex(tokenPayload.jti!);

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
      logger.warn(`Refresh token revoked | userId=${tokenPayload.id}`);

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

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = sha256Hex(token);

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

    logger.info(
      `Email verified successfully | userId=${verificationToken.user.id}`,
    );
  }

  async resendVerification(userId: string) {
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

    // Remove previous verification tokens
    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Generate new verification token
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

    logger.info(
      `Verification email re-queued | userId=${user.id} | email=${user.email}`,
    );
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const { email } = data;

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

    // Generate new reset token
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

    logger.info(`Password reset email queued for user ${user.id}`);
  }

  async resetPassword(token: string, data: ResetPasswordDto) {
    const { newPassword } = data;

    const tokenHash = sha256Hex(token);

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

    const isSamePassword = await comparePassword(
      newPassword,
      passwordResetToken.user.password!,
    );

    if (isSamePassword) {
      throw new AppError(ERROR_MESSAGES.SAME_PASSWORD, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(newPassword);

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

    await cacheRedis.del(`user:${passwordResetToken.user.id}`);

    logger.info(
      `Password reset successfully | userId=${passwordResetToken.user.id}`,
    );
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
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

    // Verify current password
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

    // Prevent using the same password
    const isSamePassword = await comparePassword(newPassword, user.password!);

    if (isSamePassword) {
      throw new AppError(ERROR_MESSAGES.SAME_PASSWORD, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
        },
      });

      // Logout from all devices
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

    // Invalidate cached profile
    await cacheRedis.del(`user:${user.id}`);
  }

  async getMe(userId: string) {
    const cacheKey = `user:${userId}`;

    // Check cache
    const cachedUser = await cacheRedis.get(cacheKey);

    if (cachedUser) {
      return {
        user: JSON.parse(cachedUser),
        cached: true,
      };
    }

    // Fetch from database
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

    // Cache for 5 minutes
    await cacheRedis.set(cacheKey, JSON.stringify(user), "EX", 60 * 5);

    return {
      user,
      cached: false,
    };
  }

  async revokeAllSessions(userId: string) {
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

    // Invalidate cached profile
    await cacheRedis.del(`user:${userId}`);

    logger.info(`All sessions revoked | userId=${userId}`);
  }
}

export const authService = new AuthService();
