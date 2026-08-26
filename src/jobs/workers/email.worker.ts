import { Worker } from "bullmq";
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "../../emails/email.service.js";
import { env } from "../../config/env.js";
import { EMAIL_JOBS } from "../../constants/jobs/jobs.js";
import { logger } from "../../shared/logging/logger.js";
import { LOG_EVENTS } from "../../constants/index.js";

/**
 * ============================================================================
 * Email Background Worker (BullMQ)
 * ============================================================================
 * Consumes email jobs from Redis queue `email-queue` and routes them to
 * the appropriate transactional email dispatch handler with structured telemetry.
 */

/**
 * ----------------------------------------------------------------------------
 * 1. Worker Processor Definition
 * ----------------------------------------------------------------------------
 * Processes incoming email jobs with a maximum concurrency of 5 parallel tasks.
 */
export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    logger.info({
      event: LOG_EVENTS.JOB_PROCESSING,
      component: "EmailWorker",
      jobId: job.id,
      jobName: job.name,
    });

    // Route job based on predefined job identifier
    switch (job.name) {
      case EMAIL_JOBS.VERIFICATION:
        await sendVerificationEmail(job.data);
        break;
      case EMAIL_JOBS.RESET_PASSWORD:
        await sendResetPasswordEmail(job.data);
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

/**
 * ----------------------------------------------------------------------------
 * 2. Job Lifecycle Telemetry & Event Listeners
 * ----------------------------------------------------------------------------
 */

// Emitted when a job starts active execution
emailWorker.on("active", (job) => {
  logger.info({
    event: LOG_EVENTS.JOB_STARTED,
    component: "EmailWorker",
    jobId: job.id,
    jobName: job.name,
  });
});

// Emitted when a job finishes successfully
emailWorker.on("completed", (job) => {
  logger.info({
    event: LOG_EVENTS.JOB_COMPLETED,
    component: "EmailWorker",
    jobId: job.id,
    jobName: job.name,
  });
});

// Emitted when a job fails after processing
emailWorker.on("failed", (job, err) => {
  logger.error({
    event: LOG_EVENTS.JOB_FAILED,
    component: "EmailWorker",
    jobId: job?.id,
    jobName: job?.name,
    error: {
      message: err.message,
      stack: err.stack,
    },
  });
});
