import nodemailer from "nodemailer";
import { env } from "./env.js";
import { logger } from "../shared/logging/logger.js";
import { LOG_EVENTS } from "../constants/index.js";

/**
 * ============================================================================
 * SMTP Mailer Configuration (Nodemailer)
 * ============================================================================
 * High-performance pooled SMTP transport configuration for transactional email
 * delivery (verification tokens, password reset instructions).
 * Configured with connection reuse and rate limiting to prevent SMTP provider throttling.
 */

/**
 * ----------------------------------------------------------------------------
 * 1. SMTP Pooled Transporter Initialization
 * ----------------------------------------------------------------------------
 */
export const transporter = nodemailer.createTransport({
  name: env.SMTP_NAME,
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: true,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  // Maintain a reusable pool of socket connections
  pool: true,
  // Maintain up to 5 concurrent socket connections
  maxConnections: 5,
  // Send up to 100 messages per open socket connection
  maxMessages: 100,
  // Rate-limiting window: 1000ms (1 second)
  rateDelta: 1000,
  // Rate-limiting limit: Max 10 messages per second
  rateLimit: 10,
});

/**
 * ----------------------------------------------------------------------------
 * 2. Asynchronous SMTP Connectivity Verification
 * ----------------------------------------------------------------------------
 */
transporter
  .verify()
  .then(() => {
    logger.info({
      event: LOG_EVENTS.SMTP_READY,
      component: "EmailService",
    });
  })
  .catch((error) => {
    logger.error({
      event: LOG_EVENTS.SMTP_CONNECTION_FAILED,
      component: "EmailService",
      error,
    });
  });
