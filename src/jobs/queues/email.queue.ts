import { Queue } from "bullmq";
import { env } from "../../config/env.js";

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
