import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "http";
import type { AddressInfo } from "net";

vi.mock("../../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../src/jobs/queues/email.queue.js", () => ({
  emailQueue: {
    add: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../src/config/redis.js", () => ({
  cacheRedis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    setex: vi.fn().mockResolvedValue("OK"),
    keys: vi.fn().mockResolvedValue([]),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(60),
  },
}));

vi.mock("../../src/shared/utils/auth/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password-123"),
  comparePassword: vi.fn(),
}));

import { prisma } from "../../src/config/prisma.js";
import { comparePassword } from "../../src/shared/utils/auth/password.js";
import app from "../../src/app.js";

/**
 * ============================================================================
 * Auth End-to-End Route Integration Tests
 * ============================================================================
 * Integration tests for authentication endpoints, Zod validation, HTTP status
 * codes, and cookie serialization.
 */
describe("Auth API Integration Tests", () => {
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

  describe("POST /api/v1/auth/signup", () => {
    it("should reject signup with missing fields with 400", async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email" }),
      });

      const json = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Validation Failed");
      expect(Array.isArray(json.errors)).toBe(true);
    });

    it("should create user and return 201 on valid registration", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback({
            user: {
              create: vi.fn().mockResolvedValue({
                id: "user-test-1",
                firstName: "Harshit",
                lastName: "Kumar",
                email: "harshit@example.com",
              }),
            },
            emailVerificationToken: {
              create: vi.fn().mockResolvedValue({}),
            },
          });
        },
      );

      const res = await fetch(`${baseUrl}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Harshit",
          lastName: "Kumar",
          email: "harshit@example.com",
          password: "Password@123",
        }),
      });

      const json = (await res.json()) as any;

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should return 400 when login payload is missing password", async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "harshit@example.com" }),
      });

      const json = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("Validation Failed");
    });

    it("should return 401 when credentials do not match", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-test-1",
        email: "harshit@example.com",
        password: "hashed-password-123",
        status: "ACTIVE",
        role: "USER",
        failedLoginAttempts: 0,
        lockUntil: null,
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "harshit@example.com",
          password: "WrongPassword@123",
        }),
      });

      const json = (await res.json()) as any;

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("should authenticate and set HTTP-only cookies on valid credentials", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-test-1",
        email: "harshit@example.com",
        firstName: "Harshit",
        lastName: "Kumar",
        username: "harshit",
        password: "hashed-password-123",
        status: "ACTIVE",
        role: "USER",
        failedLoginAttempts: 0,
        lockUntil: null,
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(true);
      vi.mocked(prisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback({
            session: {
              create: vi.fn().mockResolvedValue({ id: "session-1" }),
            },
            refreshToken: {
              create: vi.fn().mockResolvedValue({ id: "token-1" }),
            },
            user: {
              update: vi.fn().mockResolvedValue({}),
            },
          });
        },
      );

      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "harshit@example.com",
          password: "Password@123",
        }),
      });

      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.email).toBe("harshit@example.com");

      // Verify Set-Cookie header contains auth tokens
      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain("if_accessToken");
      expect(cookieHeader).toContain("if_refreshToken");
      expect(cookieHeader).toContain("HttpOnly");
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should return 200 and clear authentication cookies", async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: "POST",
      });

      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain("if_accessToken=;");
      expect(cookieHeader).toContain("if_refreshToken=;");
    });
  });
});
