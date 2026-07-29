import { describe, expect, it } from "vitest";
import { AppError } from "../../../../src/shared/utils/appError.js";

describe("AppError", () => {
  it("should create an AppError with the provided message and status code", () => {
    const error = new AppError("Something went wrong", 400);

    expect(error.message).toBe("Something went wrong");
    expect(error.statusCode).toBe(400);
    expect(error.success).toBe(false);
    expect(error.isOperational).toBe(true);
  });

  it("should use the default status code when none is provided", () => {
    const error = new AppError("Internal Server Error");

    expect(error.statusCode).toBe(500);
  });

  it("should be an instance of AppError", () => {
    const error = new AppError("Error");

    expect(error).toBeInstanceOf(AppError);
  });

  it("should also be an instance of the native Error class", () => {
    const error = new AppError("Error");

    expect(error).toBeInstanceOf(Error);
  });

  it("should preserve the stack trace", () => {
    const error = new AppError("Error");

    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe("string");
  });

  it("should have the correct prototype", () => {
    const error = new AppError("Error");

    expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
  });
});
