import { describe, expect, it } from "vitest";
import { maskEmail } from "../../../../src/shared/utils/mask.js";

describe("maskEmail", () => {
  it("should mask an email with a name longer than two characters", () => {
    const result = maskEmail("harshit@example.com");

    expect(result).toBe("ha***@example.com");
  });

  it("should not mask a name with exactly two characters", () => {
    const result = maskEmail("ab@example.com");

    expect(result).toBe("ab@example.com");
  });

  it("should not mask a name with one character", () => {
    const result = maskEmail("a@example.com");

    expect(result).toBe("a@example.com");
  });

  it("should return an empty string when email is empty", () => {
    expect(maskEmail("")).toBe("");
  });

  it("should return an empty string when email is not a string", () => {
    expect(maskEmail(null as any)).toBe("");
    expect(maskEmail(undefined as any)).toBe("");
    expect(maskEmail(123 as any)).toBe("");
    expect(maskEmail({} as any)).toBe("");
  });

  it("should return *** when email has no @ symbol", () => {
    expect(maskEmail("harshit")).toBe("***");
  });

  it("should return *** when name is missing", () => {
    expect(maskEmail("@example.com")).toBe("***");
  });

  it("should return *** when domain is missing", () => {
    expect(maskEmail("harshit@")).toBe("***");
  });

  it("should preserve the original domain", () => {
    const result = maskEmail("john@gmail.com");

    expect(result).toBe("jo***@gmail.com");
  });
});
