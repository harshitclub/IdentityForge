import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "http";
import type { AddressInfo } from "net";

vi.mock("../../src/config/prisma.js", () => ({
  prisma: {},
}));

vi.mock("../../src/config/redis.js", () => ({
  cacheRedis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

import app from "../../src/app.js";

/**
 * ============================================================================
 * Application & Middleware Integration Tests
 * ============================================================================
 * End-to-end integration tests for Express middleware pipeline, error handling,
 * security headers, and request tracking.
 */
describe("Application Middleware Integration Tests", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("should return 404 for undefined routes", async () => {
    const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.message).toContain("Cannot GET /api/v1/non-existent-route");
  });

  it("should return 400 for malformed JSON request bodies", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{ invalid_json: ",
    });

    const json = (await res.json()) as any;

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it("should include X-Request-ID header in responses", async () => {
    const res = await fetch(`${baseUrl}/system/live`);

    expect(res.headers.get("x-request-id")).toBeDefined();
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("should not expose X-Powered-By header", async () => {
    const res = await fetch(`${baseUrl}/system/live`);

    expect(res.headers.get("x-powered-by")).toBeNull();
  });
});
