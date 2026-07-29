import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { getRequestLogger } from "../../../../../src/shared/request-context/request-context.js";
import {
  decodeRefreshToken,
  generateRefreshTokenWithJti,
  verifyRefreshToken,
} from "../../../../../src/shared/utils/auth/refreshToken.js";
import { LOG_EVENTS } from "../../../../../src/constants/index.js";
import { env } from "../../../../../src/config/env.js";

vi.mock("../../../../../src/shared/request-context/request-context.ts", () => ({
  getRequestLogger: vi.fn(),
}));

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const payload = {
  id: "user-123",
};

describe("refreshToken", () => {
  beforeEach(() => {
    vi.mocked(getRequestLogger).mockReturnValue(mockLogger as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("generateRefreshTokenWithJti()", () => {
    it("should generate a refresh token", () => {
      const { token } = generateRefreshTokenWithJti(payload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("should generate a jti", () => {
      const { jti } = generateRefreshTokenWithJti(payload);

      expect(jti).toBeTruthy();
      expect(typeof jti).toBe("string");
    });

    it("should preserve the payload", () => {
      const { token } = generateRefreshTokenWithJti(payload);

      const decoded = verifyRefreshToken(token);

      expect(decoded.id).toBe(payload.id);
    });

    it("should include the generated jti", () => {
      const { token, jti } = generateRefreshTokenWithJti(payload);

      const decoded = verifyRefreshToken(token);

      expect(decoded.jti).toBe(jti);
    });
  });

  describe("verifyRefreshToken()", () => {
    it("should verify a valid refresh token", () => {
      const { token } = generateRefreshTokenWithJti(payload);

      const decoded = verifyRefreshToken(token);

      expect(decoded.id).toBe(payload.id);
    });

    it("should throw TokenExpiredError for expired token", () => {
      const expiredToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: -1,
      });

      expect(() => verifyRefreshToken(expiredToken)).toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith({
        event: LOG_EVENTS.REFRESH_TOKEN_EXPIRED,
      });
    });

    it("should throw JsonWebTokenError for invalid token", () => {
      expect(() => verifyRefreshToken("invalid-token")).toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith({
        event: LOG_EVENTS.REFRESH_TOKEN_INVALID,
      });
    });

    it("should log unexpected errors", () => {
      vi.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("Unexpected");
      });

      expect(() => verifyRefreshToken("token")).toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith({
        event: LOG_EVENTS.REFRESH_TOKEN_VERIFICATION_ERROR,
        error: expect.any(Error),
      });
    });
  });

  describe("decodeRefreshToken()", () => {
    it("should decode a valid refresh token", () => {
      const { token } = generateRefreshTokenWithJti(payload);

      const decoded = decodeRefreshToken(token);

      expect(decoded).toBeTruthy();
      expect((decoded as jwt.JwtPayload).id).toBe(payload.id);
    });

    it("should return null when jwt.decode throws", () => {
      vi.spyOn(jwt, "decode").mockImplementation(() => {
        throw new Error("Decode Failed");
      });

      const decoded = decodeRefreshToken("token");

      expect(decoded).toBeNull();

      expect(mockLogger.error).toHaveBeenCalledWith({
        event: LOG_EVENTS.REFRESH_TOKEN_DECODE_FAILED,
        error: expect.any(Error),
      });
    });
  });
});
