import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { cacheRedis } from "../../config/redis.js";

export interface HealthStatus {
  database: boolean;
  redis: boolean;
}

export interface ReadinessStatus {
  database: boolean;
  redis: boolean;
}

export interface ApplicationInfo {
  name: string;
  version: string;
  environment: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  pid: number;
  uptime: number;
}

export const checkDependencies = async (): Promise<HealthStatus> => {
  let database = false;
  let redis = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {}

  try {
    await cacheRedis.ping();
    redis = true;
  } catch {}

  return {
    database,
    redis,
  };
};

export const getApplicationInfo = (): ApplicationInfo => {
  return {
    name: "IdentityForge",
    version: "1.0.0",
    environment: env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
  };
};
