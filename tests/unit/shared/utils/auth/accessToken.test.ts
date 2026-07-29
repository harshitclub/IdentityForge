import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  generateAccessToken,
  verifyAccessToken,
  type AccessTokenPayload,
} from "../../../../../src/shared/utils/auth/accessToken.js";
import { AppError } from "../../../../../src/shared/utils/appError.js";
import { getRequestLogger } from "../../../../../src/shared/request-context/request-context.js";
import { ERROR_MESSAGES } from "../../../../../src/constants/index.js";
import { env } from "../../../../../src/config/env.js";
import jwt from "jsonwebtoken";

vi.mock("../../../../../src/shared/request-context/request-context.ts", () => ({
  getRequestLogger: vi.fn(),
}));

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const payload: AccessTokenPayload = {
  id: "123",
  email: "harshit@example.com",
  role: "USER",
};

describe("accessToken", () => {
  beforeEach(() => {
    vi.mocked(getRequestLogger).mockReturnValue(mockLogger as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("generateAccessToken()", () => {
    it("should generate a JWT token", () => {
      const token = generateAccessToken(payload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("should preserve the payload", () => {
      const token = generateAccessToken(payload);

      const decoded = verifyAccessToken(token);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe("verifyAccessToken()", () => {
    it("should verify a valid token", () => {
      const token = generateAccessToken(payload);

      const decoded = verifyAccessToken(token);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it("should throw AppError when token is expired", () => {
      const expiredToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: -1,
      });

      expect(() => verifyAccessToken(expiredToken)).toThrow(AppError);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        event: expect.anything(),
      });
    });

    it("should throw AppError when token is invalid", () => {
      expect(() => verifyAccessToken("invalid-token")).toThrow(AppError);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    it("should throw AppError with correct message for invalid token", () => {
      expect(() => verifyAccessToken("invalid-token")).toThrow(
        ERROR_MESSAGES.ACCESS_TOKEN_INVALID,
      );
    });

    it("should log unexpected errors", () => {
      const spy = vi.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("Unexpected Error");
      });

      expect(() => verifyAccessToken("token")).toThrow(AppError);

      expect(mockLogger.error).toHaveBeenCalledOnce();

      spy.mockRestore();
    });
  });
});
