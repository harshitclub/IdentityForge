import client from "prom-client";

/**
 * ============================================================================
 * Prometheus Metrics Registry & Definitions
 * ============================================================================
 * Centralized registry collecting default Node.js runtime metrics along with
 * custom HTTP throughput, latency histograms, and security domain event counters.
 */

export const register = new client.Registry();

/**
 * Global default labels attached to all emitted metrics.
 */
register.setDefaultLabels({
  app: "identityforge-api",
});

/**
 * Collect Node.js process and runtime metrics (CPU, Heap, Event Loop).
 */
client.collectDefaultMetrics({
  register,
});

/**
 * ----------------------------------------------------------------------------
 * 1. HTTP Request Latency (Histogram)
 * ----------------------------------------------------------------------------
 * Measures response latency distributions across HTTP methods, routes, and status codes.
 * Buckets range from 5ms up to 10 seconds.
 */
export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * ----------------------------------------------------------------------------
 * 2. HTTP Request Counter
 * ----------------------------------------------------------------------------
 * Measures total request volume across HTTP methods, routes, and status codes.
 */
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

/**
 * ----------------------------------------------------------------------------
 * 3. Security & Authentication Event Counter
 * ----------------------------------------------------------------------------
 * Tracks domain events (login success, login failed, account locked, rate limit hit, signup).
 */
export const authEventsTotal = new client.Counter({
  name: "auth_events_total",
  help: "Total number of authentication and security domain events",
  labelNames: ["event"] as const,
  registers: [register],
});
