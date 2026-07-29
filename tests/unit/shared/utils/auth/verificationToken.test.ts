import { describe, expect, it } from "vitest";
import {
  generateVerificationTokenRaw,
  timingSafeMatch,
} from "../../../../../src/shared/utils/auth/verificationToken.js";
import crypto from "crypto";

describe("generateVerificationTokenRaw()", () => {
  it("should generate a verification token", () => {
    const token = generateVerificationTokenRaw();

    expect(token.raw).toBeTruthy();
  });

  it("should return a string token", () => {
    const token = generateVerificationTokenRaw();

    expect(typeof token.raw).toBe("string");
  });

  it("should generate a 64-character hex token", () => {
    const token = generateVerificationTokenRaw();

    expect(token.raw).toHaveLength(64);
    expect(token.raw).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should generate unique tokens", () => {
    const token1 = generateVerificationTokenRaw();
    const token2 = generateVerificationTokenRaw();

    expect(token1.raw).not.toBe(token2.raw);
  });

  it("should return an expiration date", () => {
    const token = generateVerificationTokenRaw();

    expect(token.expiresAt).toBeInstanceOf(Date);
  });

  it("should respect the ttlMinutes parameter", () => {
    const ttlMinutes = 30;

    const before = Date.now();

    const token = generateVerificationTokenRaw(ttlMinutes);

    const after = Date.now();

    expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + ttlMinutes * 60 * 1000,
    );

    expect(token.expiresAt.getTime()).toBeLessThanOrEqual(
      after + ttlMinutes * 60 * 1000,
    );
  });
});

describe("timingSafeMatch()", () => {
  it("should return true for a matching token", () => {
    const rawToken = "Hello123";

    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

    expect(timingSafeMatch(rawToken, hash)).toBe(true);
  });

  it("should return false for a different token", () => {
    const hash = crypto.createHash("sha256").update("Hello123").digest("hex");

    expect(timingSafeMatch("WrongPassword", hash)).toBe(false);
  });

  it("should return false for an invalid hash length", () => {
    expect(timingSafeMatch("Hello123", "abcd")).toBe(false);
  });

  it("should compare SHA-256 hashes correctly", () => {
    const rawToken = "verification-token";

    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

    expect(timingSafeMatch(rawToken, hash)).toBe(true);
  });
});
