import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "http";
import type { AddressInfo } from "net";

vi.mock("../../src/config/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock("../../src/config/redis.js", () => ({
  cacheRedis: {
    ping: vi.fn().mockResolvedValue("PONG"),
    flushall: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

import app from "../../src/app.js";

/**
 * ============================================================================
 * System Integration Tests
 * ============================================================================
 * End-to-end integration tests for health probes, runtime diagnostics, and metrics.
 */
describe("System Integration Tests", () => {
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

  it("GET /system/live should return 200 with alive status", async () => {
    const res = await fetch(`${baseUrl}/system/live`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.alive).toBe(true);
    expect(typeof json.data.uptime).toBe("number");
  });

  it("GET /system/version should return 200 with application version", async () => {
    const res = await fetch(`${baseUrl}/system/version`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("name");
    expect(json.data).toHaveProperty("version");
  });

  it("GET /system/info should return 200 with runtime diagnostics", async () => {
    const res = await fetch(`${baseUrl}/system/info`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("nodeVersion");
    expect(json.data).toHaveProperty("environment");
    expect(json.data).toHaveProperty("platform");
  });

  it("GET /system/health should return 200 when dependencies are healthy", async () => {
    const res = await fetch(`${baseUrl}/system/health`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("healthy");
    expect(json.data.services.database).toBe("up");
    expect(json.data.services.redis).toBe("up");
  });

  it("GET /system/ready should return 200 when ready to receive traffic", async () => {
    const res = await fetch(`${baseUrl}/system/ready`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.ready).toBe(true);
  });

  it("GET /system/metrics should expose Prometheus default and custom HTTP metrics", async () => {
    // Generate a request first to ensure custom HTTP metrics are populated
    await fetch(`${baseUrl}/system/live`);

    const res = await fetch(`${baseUrl}/system/metrics`);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(text).toContain("process_cpu_user_seconds_total");
    expect(text).toContain("nodejs_heap_size_total_bytes");
    expect(text).toContain("http_requests_total");
    expect(text).toContain("http_request_duration_seconds");
  });
});
