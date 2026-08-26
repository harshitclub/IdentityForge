import type { NextFunction, Request, Response } from "express";
import { cacheRedis } from "../../config/redis.js";
import { logger } from "../logging/logger.js";
import { env } from "../../config/env.js";
import { apiResponse } from "../utils/apiResponse.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_EVENTS,
} from "../../constants/index.js";

/**
 * ============================================================================
 * Distributed Redis Rate Limiter Middleware
 * ============================================================================
 * Enforces sliding/fixed-window request throttling per IP address using Redis.
 * Sets standard RFC rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`,
 * `X-RateLimit-Reset`, `Retry-After`).
 *
 * @returns 429 Too Many Requests when rate limit threshold is exceeded
 */
export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const WINDOW_SECONDS = env.RATE_LIMIT_WINDOW_SECONDS;
    const MAX_REQUESTS = env.RATE_LIMIT_MAX_REQUESTS;

    const rateLimitKey = `ratelimit:${req.ip}`;

    // Step 1: Increment hit count for client IP
    const currentRequestCount = await cacheRedis.incr(rateLimitKey);

    // Step 2: Initialize TTL on the first request in window
    if (currentRequestCount === 1) {
      await cacheRedis.expire(rateLimitKey, WINDOW_SECONDS);
    }

    const ttl = await cacheRedis.ttl(rateLimitKey);

    // Step 3: Set standard rate limit headers
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(MAX_REQUESTS - currentRequestCount, 0),
    );
    res.setHeader("X-RateLimit-Reset", ttl);

    // Step 4: Block request if limit exceeded
    if (currentRequestCount > MAX_REQUESTS) {
      res.setHeader("Retry-After", ttl);

      logger.warn({
        event: LOG_EVENTS.RATE_LIMIT_EXCEEDED,
        component: "RedisRateLimiter",
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        ip: req.ip,
        protocol: req.protocol,
        userAgent: req.get("User-Agent"),
        requestCount: currentRequestCount,
        maxRequests: MAX_REQUESTS,
        windowSeconds: WINDOW_SECONDS,
        retryAfter: ttl,
      });

      return apiResponse({
        req,
        res,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
