import { Worker } from "bullmq";
import { sendVerificationEmail } from "../../emails/email.service.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { EMAIL_JOBS } from "../../constants/jobs/jobs.js";

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    logger.info(`Processing email job ${job.id} (${job.name})`);
    switch (job.name) {
      case EMAIL_JOBS.VERIFICATION:
        await sendVerificationEmail(job.data);
        break;

      default:
        throw new Error(`Unknown email job: ${job.name}`);
    }
  },
  {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
    concurrency: 5,
  },
);

emailWorker.on("completed", (job) => {
  logger.info(`Email job ${job.id} (${job.name}) completed`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`Email job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

emailWorker.on("active", (job) => {
  logger.info(`Email job ${job.id} (${job.name}) started`);
});

process.on("SIGINT", async () => {
  logger.warn("Shutting down email worker");

  await emailWorker.close();

  process.exit(0);
});
