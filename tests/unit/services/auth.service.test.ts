import { beforeEach, describe, expect, it, vi } from "vitest";

import { authService } from "../../../src/modules/auth/auth.service.js";
import { prisma } from "../../../src/config/prisma.js";
import { emailQueue } from "../../../src/jobs/queues/email.queue.js";

import {
  comparePassword,
  hashPassword,
} from "../../../src/shared/utils/auth/password.js";
import { generateVerificationTokenRaw } from "../../../src/shared/utils/auth/verificationToken.js";
import { sha256Hex } from "../../../src/shared/utils/auth/sha256Hex.js";

import { AppError } from "../../../src/shared/utils/appError.js";
import { generateAccessToken } from "../../../src/shared/utils/auth/accessToken.js";
import {
  generateRefreshTokenWithJti,
  verifyRefreshToken,
} from "../../../src/shared/utils/auth/refreshToken.js";
import { cacheRedis } from "../../../src/config/redis.js";
import { EMAIL_JOBS } from "../../../src/constants/jobs/jobs.js";
import { generateResetPasswordTokenRaw } from "../../../src/shared/utils/auth/resetPasswordToken.js";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },

    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },

    session: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },

    emailVerificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },

    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },

    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/jobs/queues/email.queue.js", () => ({
  emailQueue: {
    add: vi.fn(),
  },
}));

vi.mock("../../../src/shared/utils/auth/password.js", () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
}));

vi.mock("../../../src/shared/utils/auth/verificationToken.js", () => ({
  generateVerificationTokenRaw: vi.fn(),
}));

vi.mock("../../../src/shared/utils/auth/sha256Hex.js", () => ({
  sha256Hex: vi.fn(),
}));

vi.mock("../../../src/shared/request-context/request-context.js", () => ({
  getRequestLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../../../src/shared/utils/auth/accessToken.js", () => ({
  generateAccessToken: vi.fn(),
}));

vi.mock("../../../src/shared/utils/auth/refreshToken.js", () => ({
  generateRefreshTokenWithJti: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock("../../../src/config/redis.js", () => ({
  cacheRedis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("../../../src/shared/utils/auth/resetPasswordToken.js", () => ({
  verifyResetPasswordToken: vi.fn(),
}));

vi.mock("../../../src/shared/utils/auth/resetPasswordToken.js", () => ({
  generateResetPasswordTokenRaw: vi.fn(),
}));

const signupData = {
  firstName: "Harshit",
  lastName: "Kumar",
  email: "harshit@example.com",
  password: "Password@123",
};

const tx = {
  user: {
    create: vi.fn(),
    update: vi.fn(),
  },

  emailVerificationToken: {
    create: vi.fn(),
    delete: vi.fn(),
  },

  session: {
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },

  refreshToken: {
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  passwordResetToken: {
    update: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
    callback(tx),
  );
});

const loginData = {
  email: "harshit@example.com",
  password: "Password@123",
};

const sessionMetadata = {
  ipAddress: "127.0.0.1",
  userAgent: "Chrome",
  browser: "",
  os: "",
  device: "",
};

const setupSuccessfulLogin = () => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: "1",
    email: loginData.email,
    firstName: "Harshit",
    lastName: "Kumar",
    username: null,
    role: "USER",
    password: "hashed-password",
    failedLoginAttempts: 0,
    lockUntil: null,
    deletedAt: null,
    status: "ACTIVE",
  } as any);

  vi.mocked(comparePassword).mockResolvedValue(true);

  vi.mocked(generateAccessToken).mockReturnValue("access-token");

  vi.mocked(generateRefreshTokenWithJti).mockReturnValue({
    token: "refresh-token",
    jti: "refresh-jti",
  });

  vi.mocked(sha256Hex).mockReturnValue("hashed-jti");

  tx.session.create.mockResolvedValue({
    id: "session-id",
  });

  tx.refreshToken.create.mockResolvedValue({});

  tx.user.update.mockResolvedValue({});
};

describe("AuthService", () => {
  describe("signup()", () => {
    it("should throw AppError if email already exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-id",
      } as any);

      await expect(authService.signup(signupData)).rejects.toBeInstanceOf(
        AppError,
      );

      expect(hashPassword).not.toHaveBeenCalled();

      expect(emailQueue.add).not.toHaveBeenCalled();
    });

    it("should signup a new user successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      vi.mocked(hashPassword).mockResolvedValue("hashed-password");

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",

        expiresAt: new Date(),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      tx.user.create.mockResolvedValue({
        id: "1",

        email: signupData.email,

        firstName: signupData.firstName,
      });

      tx.emailVerificationToken.create.mockResolvedValue({});

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.signup(signupData);

      expect(hashPassword).toHaveBeenCalledWith(signupData.password);

      expect(tx.user.create).toHaveBeenCalled();

      expect(tx.emailVerificationToken.create).toHaveBeenCalled();

      expect(emailQueue.add).toHaveBeenCalledTimes(1);
    });

    it("should throw if transaction fails", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      vi.mocked(hashPassword).mockResolvedValue("hashed-password");

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",
        expiresAt: new Date(),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error("Database transaction failed"),
      );

      await expect(authService.signup(signupData)).rejects.toThrow(
        "Database transaction failed",
      );

      expect(emailQueue.add).not.toHaveBeenCalled();
    });

    it("should throw if email queue fails", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      vi.mocked(hashPassword).mockResolvedValue("hashed-password");

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",
        expiresAt: new Date(),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      tx.user.create.mockResolvedValue({
        id: "1",
        email: signupData.email,
        firstName: signupData.firstName,
      });

      tx.emailVerificationToken.create.mockResolvedValue({});

      vi.mocked(emailQueue.add).mockRejectedValue(
        new Error("Redis unavailable"),
      );

      await expect(authService.signup(signupData)).rejects.toThrow(
        "Redis unavailable",
      );
    });

    it("should store hashed password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      vi.mocked(hashPassword).mockResolvedValue("my-super-hash");

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",
        expiresAt: new Date(),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      tx.user.create.mockResolvedValue({
        id: "1",
        email: signupData.email,
        firstName: signupData.firstName,
      });

      tx.emailVerificationToken.create.mockResolvedValue({});

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.signup(signupData);

      expect(tx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: "my-super-hash",
        }),
      });
    });

    it("should enqueue verification email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      vi.mocked(hashPassword).mockResolvedValue("hashed-password");

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",
        expiresAt: new Date(),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      tx.user.create.mockResolvedValue({
        id: "1",
        email: signupData.email,
        firstName: signupData.firstName,
      });

      tx.emailVerificationToken.create.mockResolvedValue({});

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.signup(signupData);

      expect(emailQueue.add).toHaveBeenCalledWith(
        expect.any(String),

        expect.objectContaining({
          email: signupData.email,

          firstName: signupData.firstName,

          verificationUrl: expect.stringContaining(
            "verify-email?token=raw-token",
          ),
        }),
      );
    });
  });

  describe("login()", () => {
    it("should throw AppError if user does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        authService.login(loginData, sessionMetadata),
      ).rejects.toBeInstanceOf(AppError);

      expect(comparePassword).not.toHaveBeenCalled();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should throw if account is deleted", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: loginData.email,
        firstName: "Harshit",
        lastName: "Kumar",
        username: null,
        role: "USER",
        password: "hashed-password",
        failedLoginAttempts: 0,
        lockUntil: null,
        deletedAt: new Date(),
        status: "DELETED",
      } as any);

      await expect(
        authService.login(loginData, sessionMetadata),
      ).rejects.toBeInstanceOf(AppError);

      expect(comparePassword).not.toHaveBeenCalled();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should throw if account is locked", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: loginData.email,
        firstName: "Harshit",
        lastName: "Kumar",
        username: null,
        role: "USER",
        password: "hashed-password",
        failedLoginAttempts: 4,
        lockUntil: new Date(Date.now() + 1000 * 60 * 10),
        deletedAt: null,
        status: "ACTIVE",
      } as any);

      await expect(
        authService.login(loginData, sessionMetadata),
      ).rejects.toBeInstanceOf(AppError);

      expect(comparePassword).not.toHaveBeenCalled();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should throw if password is incorrect", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: loginData.email,
        firstName: "Harshit",
        lastName: "Kumar",
        username: null,
        role: "USER",
        password: "hashed-password",
        failedLoginAttempts: 0,
        lockUntil: null,
        deletedAt: null,
        status: "ACTIVE",
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      vi.mocked(prisma.user.update).mockResolvedValue({
        failedLoginAttempts: 1,
      } as any);

      await expect(
        authService.login(loginData, sessionMetadata),
      ).rejects.toBeInstanceOf(AppError);

      expect(comparePassword).toHaveBeenCalledWith(
        loginData.password,
        "hashed-password",
      );

      expect(prisma.user.update).toHaveBeenCalled();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should login successfully", async () => {
      setupSuccessfulLogin();

      const result = await authService.login(loginData, sessionMetadata);

      expect(result.accessToken).toBe("access-token");

      expect(result.refreshToken).toBe("refresh-token");

      expect(result.user.email).toBe(loginData.email);
    });

    it("should generate access token", async () => {
      setupSuccessfulLogin();

      await authService.login(loginData, sessionMetadata);

      expect(generateAccessToken).toHaveBeenCalledWith({
        id: "1",
        email: loginData.email,
        role: "USER",
      });
    });

    it("should create a session", async () => {
      setupSuccessfulLogin();

      const result = await authService.login(loginData, sessionMetadata);

      expect(result.accessToken).toBe("access-token");

      expect(result.refreshToken).toBe("refresh-token");

      expect(result.user.email).toBe(loginData.email);
    });

    it("should generate access token", async () => {
      setupSuccessfulLogin();

      await authService.login(loginData, sessionMetadata);

      expect(tx.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "1",
          ipAddress: sessionMetadata.ipAddress,
          userAgent: sessionMetadata.userAgent,
          isCurrent: true,
        }),
      });
    });

    it("should create refresh token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: loginData.email,
        firstName: "Harshit",
        lastName: "Kumar",
        username: null,
        role: "USER",
        password: "hashed-password",
        failedLoginAttempts: 0,
        lockUntil: null,
        deletedAt: null,
        status: "ACTIVE",
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(true);

      vi.mocked(generateAccessToken).mockReturnValue("access-token");

      vi.mocked(generateRefreshTokenWithJti).mockReturnValue({
        token: "refresh-token",
        jti: "refresh-jti",
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-jti");

      tx.session.create.mockResolvedValue({
        id: "session-id",
      });

      tx.refreshToken.create.mockResolvedValue({});

      tx.user.update.mockResolvedValue({});

      const result = await authService.login(loginData, sessionMetadata);

      expect(result.accessToken).toBe("access-token");

      expect(result.refreshToken).toBe("refresh-token");

      expect(result.user.email).toBe(loginData.email);
    });

    it("should generate access token", async () => {
      setupSuccessfulLogin();

      await authService.login(loginData, sessionMetadata);

      expect(tx.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "1",
          sessionId: "session-id",
          tokenHash: "hashed-jti",
        }),
      });
    });

    it("should reset failed login attempts", async () => {
      setupSuccessfulLogin();

      await authService.login(loginData, sessionMetadata);

      expect(tx.user.update).toHaveBeenCalledWith({
        where: {
          id: "1",
        },
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockUntil: null,
          lastLoginAt: expect.any(Date),
        }),
      });
    });

    it("should return authenticated user", async () => {
      setupSuccessfulLogin();

      const result = await authService.login(loginData, sessionMetadata);

      expect(result.user).toEqual({
        id: "1",
        email: loginData.email,
        firstName: "Harshit",
        lastName: "Kumar",
        username: null,
        role: "USER",
      });
    });
  });

  describe("logout()", () => {
    it("should return immediately when refresh token is not provided", async () => {
      await expect(authService.logout()).resolves.toBeUndefined();

      expect(verifyRefreshToken).not.toHaveBeenCalled();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should logout successfully", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "refresh-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-jti");

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.logout("refresh-token");

      expect(verifyRefreshToken).toHaveBeenCalledWith("refresh-token");

      expect(sha256Hex).toHaveBeenCalledWith("refresh-jti");

      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          tokenHash: "hashed-jti",
        },
      });

      expect(tx.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });

      expect(cacheRedis.del).toHaveBeenCalledWith("user:user-1");
    });

    it("should ignore invalid refresh token", async () => {
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(
        authService.logout("invalid-token"),
      ).resolves.toBeUndefined();
    });

    it("should invalidate cached user profile", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "refresh-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-jti");

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.logout("refresh-token");

      expect(cacheRedis.del).toHaveBeenCalledTimes(1);

      expect(cacheRedis.del).toHaveBeenCalledWith("user:user-1");
    });
  });

  describe("refreshToken()", () => {
    it("should throw if refresh token is not found", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "refresh-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-jti");

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null);

      await expect(
        authService.refreshToken("refresh-token"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("should throw if refresh token has expired", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "refresh-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-jti");

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: "token",

        userId: "user-1",

        sessionId: "session-1",

        expiresAt: new Date(Date.now() - 1000),
      } as any);

      await expect(
        authService.refreshToken("refresh-token"),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should throw if user does not exist", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "refresh-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-jti");

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: "token",

        userId: "user-1",

        sessionId: "session-1",

        expiresAt: new Date(Date.now() + 60000),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        authService.refreshToken("refresh-token"),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should refresh tokens successfully", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "old-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-old-jti");

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: "token-id",

        userId: "user-1",

        sessionId: "session-id",

        expiresAt: new Date(Date.now() + 60000),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",

        email: "harshit@example.com",

        role: "USER",
      } as any);

      vi.mocked(generateAccessToken).mockReturnValue("new-access-token");

      vi.mocked(generateRefreshTokenWithJti).mockReturnValue({
        token: "new-refresh-token",

        jti: "new-jti",
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-new-jti");

      tx.refreshToken.delete.mockResolvedValue({} as any);

      tx.refreshToken.create.mockResolvedValue({} as any);

      tx.session.update.mockResolvedValue({} as any);

      const result = await authService.refreshToken("refresh-token");

      expect(result.accessToken).toBe("new-access-token");

      expect(result.refreshToken).toBe("new-refresh-token");
    });

    it("should delete old refresh token", async () => {
      // Arrange
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",
        jti: "old-jti",
      } as any);

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: "token-id",
        userId: "user-1",
        sessionId: "session-id",
        expiresAt: new Date(Date.now() + 60_000),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "harshit@example.com",
        role: "USER",
      } as any);

      vi.mocked(generateAccessToken).mockReturnValue("new-access-token");

      vi.mocked(generateRefreshTokenWithJti).mockReturnValue({
        token: "new-refresh-token",
        jti: "new-jti",
      });

      // IMPORTANT: sha256Hex() is called twice.
      vi.mocked(sha256Hex)
        .mockReturnValueOnce("hashed-old-jti")
        .mockReturnValueOnce("hashed-new-jti");

      tx.refreshToken.delete.mockResolvedValue({} as any);
      tx.refreshToken.create.mockResolvedValue({} as any);
      tx.session.update.mockResolvedValue({} as any);

      // Act
      await authService.refreshToken("refresh-token");

      // Assert
      expect(tx.refreshToken.delete).toHaveBeenCalledWith({
        where: {
          tokenHash: "hashed-old-jti",
        },
      });
    });

    it("should create new refresh token", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "old-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-old-jti");

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: "token-id",

        userId: "user-1",

        sessionId: "session-id",

        expiresAt: new Date(Date.now() + 60000),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",

        email: "harshit@example.com",

        role: "USER",
      } as any);

      vi.mocked(generateAccessToken).mockReturnValue("new-access-token");

      vi.mocked(generateRefreshTokenWithJti).mockReturnValue({
        token: "new-refresh-token",

        jti: "new-jti",
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-new-jti");

      tx.refreshToken.delete.mockResolvedValue({} as any);

      tx.refreshToken.create.mockResolvedValue({} as any);

      tx.session.update.mockResolvedValue({} as any);

      await authService.refreshToken("refresh-token");

      expect(tx.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",

          sessionId: "session-id",
        }),
      });
    });

    it("should update session last used time", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "old-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-old-jti");

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: "token-id",

        userId: "user-1",

        sessionId: "session-id",

        expiresAt: new Date(Date.now() + 60000),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",

        email: "harshit@example.com",

        role: "USER",
      } as any);

      vi.mocked(generateAccessToken).mockReturnValue("new-access-token");

      vi.mocked(generateRefreshTokenWithJti).mockReturnValue({
        token: "new-refresh-token",

        jti: "new-jti",
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-new-jti");

      tx.refreshToken.delete.mockResolvedValue({} as any);

      tx.refreshToken.create.mockResolvedValue({} as any);

      tx.session.update.mockResolvedValue({} as any);

      await authService.refreshToken("refresh-token");

      expect(tx.session.update).toHaveBeenCalledWith({
        where: {
          id: "session-id",
        },

        data: {
          lastUsedAt: expect.any(Date),
        },
      });
    });

    it("should generate a new access token", async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        id: "user-1",

        jti: "old-jti",
      } as any);

      vi.mocked(sha256Hex).mockReturnValue("hashed-old-jti");

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: "token-id",

        userId: "user-1",

        sessionId: "session-id",

        expiresAt: new Date(Date.now() + 60000),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",

        email: "harshit@example.com",

        role: "USER",
      } as any);

      vi.mocked(generateAccessToken).mockReturnValue("new-access-token");

      vi.mocked(generateRefreshTokenWithJti).mockReturnValue({
        token: "new-refresh-token",

        jti: "new-jti",
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-new-jti");

      tx.refreshToken.delete.mockResolvedValue({} as any);

      tx.refreshToken.create.mockResolvedValue({} as any);

      tx.session.update.mockResolvedValue({} as any);

      await authService.refreshToken("refresh-token");

      expect(generateAccessToken).toHaveBeenCalledWith({
        id: "user-1",

        email: "harshit@example.com",

        role: "USER",
      });
    });
  });

  describe("verifyEmail()", () => {
    it("should throw if verification token is invalid", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(
        null,
      );

      await expect(
        authService.verifyEmail("verification-token"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should throw if verification token has expired", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
        id: "verification-id",
        expiresAt: new Date(Date.now() - 1000),

        user: {
          id: "user-1",
          isEmailVerified: false,
        },
      } as any);

      await expect(
        authService.verifyEmail("verification-token"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
    it("should throw if email is already verified", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
        id: "verification-id",
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          isEmailVerified: true,
        },
      } as any);

      await expect(
        authService.verifyEmail("verification-token"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should verify email successfully", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
        id: "verification-id",

        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          isEmailVerified: false,
        },
      } as any);

      tx.user.update.mockResolvedValue({} as any);

      tx.emailVerificationToken.delete.mockResolvedValue({} as any);

      await expect(
        authService.verifyEmail("verification-token"),
      ).resolves.toBeUndefined();
    });

    it("should update user email verification status", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
        id: "verification-id",

        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          isEmailVerified: false,
        },
      } as any);

      tx.user.update.mockResolvedValue({} as any);

      tx.emailVerificationToken.delete.mockResolvedValue({} as any);

      await authService.verifyEmail("verification-token");

      expect(tx.user.update).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },

        data: {
          isEmailVerified: true,
          status: "ACTIVE",
        },
      });
    });

    it("should delete verification token after successful verification", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
        id: "verification-id",

        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          isEmailVerified: false,
        },
      } as any);

      tx.user.update.mockResolvedValue({} as any);

      tx.emailVerificationToken.delete.mockResolvedValue({} as any);

      await authService.verifyEmail("verification-token");

      expect(tx.emailVerificationToken.delete).toHaveBeenCalledWith({
        where: {
          id: "verification-id",
        },
      });
    });
  });

  describe("resendVerification()", () => {
    it("should throw if user does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        authService.resendVerification("user-id"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.emailVerificationToken.deleteMany).not.toHaveBeenCalled();

      expect(emailQueue.add).not.toHaveBeenCalled();
    });

    it("should throw if email is already verified", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "harshit@example.com",
        firstName: "Harshit",
        isEmailVerified: true,
      } as any);

      await expect(
        authService.resendVerification("user-1"),
      ).rejects.toBeInstanceOf(AppError);

      expect(prisma.emailVerificationToken.deleteMany).not.toHaveBeenCalled();

      expect(emailQueue.add).not.toHaveBeenCalled();
    });

    it("should resend verification email successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "harshit@example.com",
        firstName: "Harshit",
        isEmailVerified: false,
      } as any);

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",
        expiresAt: new Date(Date.now() + 900000),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({
        count: 1,
      } as any);

      vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue(
        {} as any,
      );

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await expect(
        authService.resendVerification("user-1"),
      ).resolves.toBeUndefined();
    });

    it("should delete previous verification tokens", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "harshit@example.com",
        firstName: "Harshit",
        isEmailVerified: false,
      } as any);

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",
        expiresAt: new Date(Date.now() + 900000),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({
        count: 1,
      } as any);

      vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue(
        {} as any,
      );

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.resendVerification("user-1");

      expect(prisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should create new verification token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "harshit@example.com",
        firstName: "Harshit",
        isEmailVerified: false,
      } as any);

      const expiresAt = new Date(Date.now() + 900000);

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",
        expiresAt,
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({
        count: 1,
      } as any);

      vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue(
        {} as any,
      );

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.resendVerification("user-1");

      expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          tokenHash: "hashed-token",
          expiresAt,
        },
      });
    });

    it("should queue verification email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "harshit@example.com",
        firstName: "Harshit",
        isEmailVerified: false,
      } as any);

      vi.mocked(generateVerificationTokenRaw).mockReturnValue({
        raw: "raw-token",
        expiresAt: new Date(Date.now() + 900000),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({
        count: 1,
      } as any);

      vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue(
        {} as any,
      );

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.resendVerification("user-1");

      expect(emailQueue.add).toHaveBeenCalledWith(
        EMAIL_JOBS.VERIFICATION,
        expect.objectContaining({
          email: "harshit@example.com",
          firstName: "Harshit",
          verificationUrl: expect.stringContaining("raw-token"),
        }),
      );
    });
  });

  describe("forgotPassword()", () => {
    it("should return without throwing if user does not exist", async () => {
      const forgotPasswordData = {
        email: "harshit@example.com",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        authService.forgotPassword(forgotPasswordData),
      ).resolves.toBeUndefined();

      expect(prisma.passwordResetToken.deleteMany).not.toHaveBeenCalled();

      expect(emailQueue.add).not.toHaveBeenCalled();
    });

    it("should delete previous password reset tokens", async () => {
      const forgotPasswordData = {
        email: "harshit@example.com",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: forgotPasswordData.email,
      } as any);

      vi.mocked(generateResetPasswordTokenRaw).mockReturnValue({
        raw: "raw-reset-token",
        expiresAt: new Date(Date.now() + 900000),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-reset-token");

      vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({
        count: 1,
      } as any);

      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as any);

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.forgotPassword(forgotPasswordData);

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          usedAt: null,
        },
      });
    });

    it("should create new password reset token", async () => {
      const forgotPasswordData = {
        email: "harshit@example.com",
      };

      const expiresAt = new Date(Date.now() + 900000);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: forgotPasswordData.email,
      } as any);

      vi.mocked(generateResetPasswordTokenRaw).mockReturnValue({
        raw: "raw-reset-token",
        expiresAt,
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-reset-token");

      vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({
        count: 1,
      } as any);

      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as any);

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.forgotPassword(forgotPasswordData);

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          tokenHash: "hashed-reset-token",
          expiresAt,
        },
      });
    });

    it("should queue password reset email", async () => {
      const forgotPasswordData = {
        email: "harshit@example.com",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: forgotPasswordData.email,
      } as any);

      vi.mocked(generateResetPasswordTokenRaw).mockReturnValue({
        raw: "raw-reset-token",
        expiresAt: new Date(Date.now() + 900000),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-reset-token");

      vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({
        count: 1,
      } as any);

      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as any);

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await authService.forgotPassword(forgotPasswordData);

      expect(emailQueue.add).toHaveBeenCalledWith(
        EMAIL_JOBS.RESET_PASSWORD,
        expect.objectContaining({
          email: forgotPasswordData.email,
          resetPasswordUrl: expect.stringContaining("raw-reset-token"),
        }),
      );
    });

    it("should generate password reset email successfully", async () => {
      const forgotPasswordData = {
        email: "harshit@example.com",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: forgotPasswordData.email,
      } as any);

      vi.mocked(generateResetPasswordTokenRaw).mockReturnValue({
        raw: "raw-reset-token",
        expiresAt: new Date(Date.now() + 900000),
      });

      vi.mocked(sha256Hex).mockReturnValue("hashed-reset-token");

      vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({
        count: 1,
      } as any);

      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as any);

      vi.mocked(emailQueue.add).mockResolvedValue({} as any);

      await expect(
        authService.forgotPassword(forgotPasswordData),
      ).resolves.toBeUndefined();
    });
  });

  describe("resetPassword()", () => {
    it("should throw if reset token has already been used", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      await expect(
        authService.resetPassword("reset-token", {
          newPassword: "Password@123",
        }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should throw if reset token has expired", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      await expect(
        authService.resetPassword("reset-token", {
          newPassword: "Password@123",
        }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should throw if new password is same as current password", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(true);

      await expect(
        authService.resetPassword("reset-token", {
          newPassword: "Password@123",
        }),
      ).rejects.toBeInstanceOf(AppError);

      expect(hashPassword).not.toHaveBeenCalled();
    });

    it("should reset password successfully", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.passwordResetToken.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await expect(
        authService.resetPassword("reset-token", {
          newPassword: "Password@123",
        }),
      ).resolves.toBeUndefined();
    });

    it("should update user password", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.passwordResetToken.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.resetPassword("reset-token", {
        newPassword: "Password@123",
      });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },

        data: expect.objectContaining({
          password: "new-hashed-password",
          passwordChangedAt: expect.any(Date),
        }),
      });
    });

    it("should mark reset token as used", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.passwordResetToken.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.resetPassword("reset-token", {
        newPassword: "Password@123",
      });

      expect(tx.passwordResetToken.update).toHaveBeenCalledWith({
        where: {
          id: "token-id",
        },

        data: {
          usedAt: expect.any(Date),
        },
      });
    });

    it("should delete all refresh tokens", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.passwordResetToken.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.resetPassword("reset-token", {
        newPassword: "Password@123",
      });

      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should delete all sessions", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.passwordResetToken.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.resetPassword("reset-token", {
        newPassword: "Password@123",
      });

      expect(tx.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should invalidate cached user profile", async () => {
      vi.mocked(sha256Hex).mockReturnValue("hashed-token");

      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: "token-id",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),

        user: {
          id: "user-1",
          password: "hashed-password",
        },
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.passwordResetToken.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.resetPassword("reset-token", {
        newPassword: "Password@123",
      });

      expect(cacheRedis.del).toHaveBeenCalledWith("user:user-1");
    });
  });

  describe("changePassword()", () => {
    it("should throw if user does not exist", async () => {
      const changePasswordData = {
        currentPassword: "OldPassword@123",
        newPassword: "NewPassword@123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        authService.changePassword("user-1", changePasswordData),
      ).rejects.toBeInstanceOf(AppError);

      expect(comparePassword).not.toHaveBeenCalled();

      expect(hashPassword).not.toHaveBeenCalled();
    });

    it("should throw if current password is incorrect", async () => {
      const changePasswordData = {
        currentPassword: "WrongPassword",
        newPassword: "NewPassword@123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        password: "hashed-password",
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      await expect(
        authService.changePassword("user-1", changePasswordData),
      ).rejects.toBeInstanceOf(AppError);

      expect(hashPassword).not.toHaveBeenCalled();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should throw if new password is same as current password", async () => {
      const changePasswordData = {
        currentPassword: "OldPassword@123",
        newPassword: "OldPassword@123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        password: "hashed-password",
      } as any);

      vi.mocked(comparePassword)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await expect(
        authService.changePassword("user-1", changePasswordData),
      ).rejects.toBeInstanceOf(AppError);

      expect(hashPassword).not.toHaveBeenCalled();
    });

    it("should change password successfully", async () => {
      const changePasswordData = {
        currentPassword: "OldPassword@123",
        newPassword: "NewPassword@123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        password: "hashed-password",
      } as any);

      vi.mocked(comparePassword)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await expect(
        authService.changePassword("user-1", changePasswordData),
      ).resolves.toBeUndefined();
    });

    it("should update user password", async () => {
      const changePasswordData = {
        currentPassword: "OldPassword@123",
        newPassword: "NewPassword@123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        password: "hashed-password",
      } as any);

      vi.mocked(comparePassword)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.changePassword("user-1", changePasswordData);

      expect(tx.user.update).toHaveBeenCalledWith({
        where: {
          id: "user-1",
        },

        data: {
          password: "new-hashed-password",
        },
      });
    });

    it("should delete all refresh tokens", async () => {
      const changePasswordData = {
        currentPassword: "OldPassword@123",
        newPassword: "NewPassword@123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        password: "hashed-password",
      } as any);

      vi.mocked(comparePassword)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.changePassword("user-1", changePasswordData);

      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should delete all sessions", async () => {
      const changePasswordData = {
        currentPassword: "OldPassword@123",
        newPassword: "NewPassword@123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        password: "hashed-password",
      } as any);

      vi.mocked(comparePassword)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.changePassword("user-1", changePasswordData);

      expect(tx.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should invalidate cached user profile", async () => {
      const changePasswordData = {
        currentPassword: "OldPassword@123",
        newPassword: "NewPassword@123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        password: "hashed-password",
      } as any);

      vi.mocked(comparePassword)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");

      tx.user.update.mockResolvedValue({} as any);

      tx.refreshToken.deleteMany.mockResolvedValue({} as any);

      tx.session.deleteMany.mockResolvedValue({} as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.changePassword("user-1", changePasswordData);

      expect(cacheRedis.del).toHaveBeenCalledWith("user:user-1");
    });
  });

  describe("getMe()", () => {
    it("should return cached user", async () => {
      const cachedUser = {
        id: "user-1",
        firstName: "Harshit",
        lastName: "Kumar",
        username: "harshit",
        email: "harshit@example.com",
        role: "USER",
        isEmailVerified: true,
        lastLoginAt: null,
      };

      vi.mocked(cacheRedis.get).mockResolvedValue(JSON.stringify(cachedUser));

      const result = await authService.getMe("user-1");

      expect(result.cached).toBe(true);

      expect(result.user).toEqual(cachedUser);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();

      expect(cacheRedis.set).not.toHaveBeenCalled();
    });

    it("should throw if user does not exist", async () => {
      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(authService.getMe("user-1")).rejects.toBeInstanceOf(
        AppError,
      );

      expect(cacheRedis.set).not.toHaveBeenCalled();
    });

    it("should fetch user from database on cache miss", async () => {
      const user = {
        id: "user-1",
        firstName: "Harshit",
        lastName: "Kumar",
        username: "harshit",
        email: "harshit@example.com",
        role: "USER",
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      const result = await authService.getMe("user-1");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: "user-1",
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

      expect(result.cached).toBe(false);

      expect(result.user).toEqual(user);
    });

    it("should cache user after database lookup", async () => {
      const user = {
        id: "user-1",
        firstName: "Harshit",
        lastName: "Kumar",
        username: "harshit",
        email: "harshit@example.com",
        role: "USER",
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      await authService.getMe("user-1");

      expect(cacheRedis.set).toHaveBeenCalledWith(
        "user:user-1",
        JSON.stringify(user),
        "EX",
        60 * 5,
      );
    });

    it("should return user fetched from database", async () => {
      const user = {
        id: "user-1",
        firstName: "Harshit",
        lastName: "Kumar",
        username: "harshit",
        email: "harshit@example.com",
        role: "USER",
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.mocked(cacheRedis.get).mockResolvedValue(null);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      vi.mocked(cacheRedis.set).mockResolvedValue("OK");

      const result = await authService.getMe("user-1");

      expect(result).toEqual({
        user,
        cached: false,
      });
    });
  });

  describe("revokeAllSessions()", () => {
    it("should revoke all sessions successfully", async () => {
      tx.refreshToken.deleteMany.mockResolvedValue({ count: 2 } as any);

      tx.session.deleteMany.mockResolvedValue({ count: 2 } as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await expect(
        authService.revokeAllSessions("user-1"),
      ).resolves.toBeUndefined();
    });

    it("should delete all refresh tokens", async () => {
      tx.refreshToken.deleteMany.mockResolvedValue({ count: 2 } as any);

      tx.session.deleteMany.mockResolvedValue({ count: 2 } as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.revokeAllSessions("user-1");

      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should delete all sessions", async () => {
      tx.refreshToken.deleteMany.mockResolvedValue({ count: 2 } as any);

      tx.session.deleteMany.mockResolvedValue({ count: 2 } as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.revokeAllSessions("user-1");

      expect(tx.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
        },
      });
    });

    it("should invalidate cached user profile", async () => {
      tx.refreshToken.deleteMany.mockResolvedValue({ count: 2 } as any);

      tx.session.deleteMany.mockResolvedValue({ count: 2 } as any);

      vi.mocked(cacheRedis.del).mockResolvedValue(1);

      await authService.revokeAllSessions("user-1");

      expect(cacheRedis.del).toHaveBeenCalledWith("user:user-1");
    });
  });
});
