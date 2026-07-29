import { describe, expect, it } from "vitest";
import { generateResetPasswordTokenRaw } from "../../../../../src/shared/utils/auth/resetPasswordToken.js";

describe("generateResetPasswordTokenRaw()", () => {
  it("should generate a reset password token", () => {
    const token = generateResetPasswordTokenRaw();

    expect(token.raw).toBeTruthy();
  });

  it("should return a string token", () => {
    const token = generateResetPasswordTokenRaw();

    expect(typeof token.raw).toBe("string");
  });

  it("should generate a 64-character hexadecimal token", () => {
    const token = generateResetPasswordTokenRaw();

    expect(token.raw).toHaveLength(64);
    expect(token.raw).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should generate unique tokens", () => {
    const token1 = generateResetPasswordTokenRaw();
    const token2 = generateResetPasswordTokenRaw();

    expect(token1.raw).not.toBe(token2.raw);
  });

  it("should return an expiration date", () => {
    const token = generateResetPasswordTokenRaw();

    expect(token.expiresAt).toBeInstanceOf(Date);
  });

  it("should respect the ttlMinutes parameter", () => {
    const ttlMinutes = 30;

    const before = Date.now();

    const token = generateResetPasswordTokenRaw(ttlMinutes);

    const after = Date.now();

    expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + ttlMinutes * 60 * 1000,
    );

    expect(token.expiresAt.getTime()).toBeLessThanOrEqual(
      after + ttlMinutes * 60 * 1000,
    );
  });

  it("should generate different expiration times for different ttl values", () => {
    const token15 = generateResetPasswordTokenRaw(15);
    const token60 = generateResetPasswordTokenRaw(60);

    expect(token60.expiresAt.getTime()).toBeGreaterThan(
      token15.expiresAt.getTime(),
    );
  });
});
