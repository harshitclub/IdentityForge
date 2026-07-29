import { describe, expect, it } from "vitest";
import {
  comparePassword,
  hashPassword,
} from "../../../../../src/shared/utils/auth/password.js";

describe("hashPassword()", () => {
  it("should return a hashed password", async () => {
    // Arrange
    const password = "Hello123@";

    // Act
    const hashedPassword = await hashPassword(password);

    // Assert
    expect(hashedPassword).toBeTruthy();
  });

  it("should not return the original password", async () => {
    // Arrange
    const password = "Hello123@";

    // Act
    const hashedPassword = await hashPassword(password);

    // Assert
    expect(hashedPassword).not.toBe(password);
  });

  it("should return a string", async () => {
    const hashedPassword = await hashPassword("Hello123@");

    expect(typeof hashedPassword).toBe("string");
  });

  it("should generate different hashes for the same password", async () => {
    const password = "Hello123@";

    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});

describe("comparePassword()", () => {
  it("should return true for the correct password", async () => {
    const password = "Hello123@";

    const hashedPassword = await hashPassword(password);

    const result = await comparePassword(password, hashedPassword);

    expect(result).toBe(true);
  });

  it("should return false for an incorrect password", async () => {
    const hashedPassword = await hashPassword("Hello123@");

    const result = await comparePassword("WrongPassword", hashedPassword);

    expect(result).toBe(false);
  });

  it("should return a boolean", async () => {
    const hashedPassword = await hashPassword("Hello123@");

    const result = await comparePassword("Hello123@", hashedPassword);

    expect(typeof result).toBe("boolean");
  });
});
