import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),

  FRONTEND_URL: z.string(),

  PORT: z.coerce.number(),

  DATABASE_URL: z.string(),

  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),

  JWT_ACCESS_EXPIRES_IN: z.coerce.number(),
  JWT_REFRESH_EXPIRES_IN: z.coerce.number(),

  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),

  SMTP_NAME: z.string(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(parsedEnv.error.issues);
  process.exit(1);
}

export const env = parsedEnv.data;
