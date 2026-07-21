import nodemailer from "nodemailer";
import { env } from "./env.js";
import { logger } from "../shared/logging/logger.js";
import { LOG_EVENTS } from "../constants/index.js";

// SMTP Transport
export const transporter = nodemailer.createTransport({
  name: env.SMTP_NAME,
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: true,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  pool: true, // enable connection pooling
  maxConnections: 5, // maintain up to 5 open connections
  maxMessages: 100, // send up to 100 emails per connection
  rateDelta: 1000, // window for rate limit
  rateLimit: 10, // max 10 messages per second (safe default)
});

// Verify SMTP connection
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
