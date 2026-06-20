import { Redis } from "ioredis";
import { env } from "./env.js";

const createRedisConnection = () =>
  new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  });

export const cacheRedis = createRedisConnection();
