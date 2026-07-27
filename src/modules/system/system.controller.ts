import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { cacheRedis } from "../../config/redis.js";
import { SUCCESS_MESSAGES } from "../../constants/index.js";
import { apiResponse } from "../../shared/utils/apiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { checkDependencies, getApplicationInfo } from "./system.service.js";
import { register } from "../../metrics/prometheus.js";

export const health = asyncHandler(async (req: Request, res: Response) => {
  const { database, redis } = await checkDependencies();
  const healthy = database && redis;

  return apiResponse({
    req,
    res,
    statusCode: healthy ? 200 : 503,
    message: healthy ? "Application is healthy." : "Application is unhealthy.",
    data: {
      status: healthy ? "healthy" : "unhealthy",
      services: {
        database: database ? "up" : "down",
        redis: redis ? "up" : "down",
      },
    },
  });
});

export const ready = asyncHandler(async (req: Request, res: Response) => {
  const { database, redis } = await checkDependencies();

  const ready = database && redis;

  return apiResponse({
    req,
    res,
    statusCode: ready ? 200 : 503,
    message: ready ? "Application is ready." : "Application is not ready.",
    data: {
      ready,
      services: {
        database: database ? "up" : "down",
        redis: redis ? "up" : "down",
      },
    },
  });
});

export const live = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Application is alive.",
    data: {
      alive: true,
      uptime: Math.floor(process.uptime()),
    },
  });
});

export const version = asyncHandler(async (req: Request, res: Response) => {
  return apiResponse({
    req,
    res,
    message: "Application version fetched successfully.",
    data: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
    },
  });
});

export const info = asyncHandler(async (req: Request, res: Response) => {
  const applicationInfo = getApplicationInfo();

  return apiResponse({
    req,
    res,
    message: "Application information fetched successfully.",
    data: applicationInfo,
  });
});

export const resetCache = asyncHandler(async (req: Request, res: Response) => {
  await cacheRedis.flushall();

  return apiResponse({
    req,
    res,
    message: SUCCESS_MESSAGES.CACHE_RESET,
  });
});

export const metrics = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", register.contentType);

  res.end(await register.metrics());
});
