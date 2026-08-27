import type { NextFunction, Request, Response } from "express";
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from "../../metrics/prometheus.js";

/**
 * Normalizes dynamic URI path parameters (UUIDs, CUIDs, Mongo ObjectIDs, numeric IDs)
 * into a static ':id' placeholder to prevent unbounded Prometheus label cardinality.
 */
export function normalizeRoute(path: string): string {
  const base = path.split("?")[0] || "";
  return base
    // Replace UUIDs
    .replace(
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
      ":id",
    )
    // Replace CUIDs, Mongo IDs, or long generated tokens in path segments
    .replace(/\/[a-zA-Z0-9_-]{16,}/g, "/:id")
    // Replace integer IDs
    .replace(/\/\d+/g, "/:id");
}

/**
 * ============================================================================
 * HTTP Metrics Middleware
 * ============================================================================
 * Intercepts incoming HTTP requests, calculates execution latency, normalizes
 * parameterized route paths (to prevent high label cardinality), and records
 * Prometheus histogram and counter metrics upon response finish.
 */
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Exclude Prometheus scraper endpoint itself from telemetry
  if (req.originalUrl === "/system/metrics") {
    return next();
  }

  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;

    // Determine route pattern (prefer Express matched route pattern e.g. /api/v1/users/:id)
    let route = req.baseUrl
      ? `${req.baseUrl}${req.route?.path || ""}`
      : req.route?.path || req.path;

    if (!route || route === "") {
      route = normalizeRoute(req.originalUrl);
    } else {
      route = normalizeRoute(route);
    }

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestDurationSeconds.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  });

  next();
};
