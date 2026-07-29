import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../../../../src/shared/utils/auth/sha256Hex.js";

describe("sha256Hex()", () => {
  it("should return a hash", () => {
    // Arrange
    const input = "Hello123@";

    // Act
    const hash = sha256Hex(input);

    // Assert
    expect(hash).toBeTruthy();
  });

  it("should return a string", () => {
    const hash = sha256Hex("Hello123@");

    expect(typeof hash).toBe("string");
  });

  it("should return the same hash for the same input", () => {
    const input = "Hello123@";

    const hash1 = sha256Hex(input);
    const hash2 = sha256Hex(input);

    expect(hash1).toBe(hash2);
  });

  it("should return different hashes for different inputs", () => {
    const hash1 = sha256Hex("Hello123@");
    const hash2 = sha256Hex("Password123@");

    expect(hash1).not.toBe(hash2);
  });

  it("should return a 64-character hash", () => {
    const hash = sha256Hex("Hello123@");

    expect(hash).toHaveLength(64);
  });

  it("should return a hexadecimal string", () => {
    const hash = sha256Hex("Hello123@");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
