import { Queue } from "bullmq";
import { env } from "../../config/env.js";

/**
 * ============================================================================
 * Email Job Queue (BullMQ)
 * ============================================================================
 * Distributed job queue backed by Redis for asynchronous email processing.
 * Decouples user HTTP requests from SMTP network latency and ensures reliable
 * email delivery with automatic retries and exponential backoff.
 */

/**
 * Email Queue Instance
 * - Attempts: Up to 3 retry attempts per failed job
 * - Backoff: Exponential backoff starting at 5000ms (5s, 10s, 20s)
 * - Memory Retention: Retains the latest 100 completed and 50 failed job payloads
 */
export const emailQueue = new Queue("email-queue", {
  connection: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
