import { describe, expect, it } from "vitest";
import type { Request } from "express";

import { getSessionMetadata } from "../../../../src/shared/utils/session.util.js";

describe("getSessionMetadata", () => {
  it("should return session metadata", () => {
    const req = {
      ip: "127.0.0.1",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
    } as Request;

    const metadata = getSessionMetadata(req);

    expect(metadata.ipAddress).toBe("127.0.0.1");
    expect(metadata.userAgent).toBe(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    );
    expect(metadata.browser).toBe("Chrome");
    expect(metadata.os).toBe("Windows");
    expect(metadata.device).toBe("Desktop");
    expect(metadata.country).toBeNull();
    expect(metadata.city).toBeNull();
  });

  it("should return null when ip is missing", () => {
    const req = {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
    } as Request;

    const metadata = getSessionMetadata(req);

    expect(metadata.ipAddress).toBeNull();
  });

  it("should return null when user-agent is missing", () => {
    const req = {
      ip: "127.0.0.1",
      headers: {},
    } as Request;

    const metadata = getSessionMetadata(req);

    expect(metadata.userAgent).toBeNull();
    expect(metadata.browser).toBeNull();
    expect(metadata.os).toBeNull();
    expect(metadata.device).toBe("Desktop");
  });

  it("should identify a mobile device", () => {
    const req = {
      ip: "127.0.0.1",
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    } as Request;

    const metadata = getSessionMetadata(req);

    expect(metadata.device).toBe("mobile");
  });
});
