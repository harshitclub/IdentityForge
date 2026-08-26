import { env } from "../config/env.js";
import { transporter } from "../config/mailer.js";
import { LOG_EVENTS } from "../constants/index.js";
import { logger } from "../shared/logging/logger.js";
import { resetPasswordEmailTemplate } from "./templates/reset-password.template.js";
import { verificationEmailTemplate } from "./templates/verify-email.template.js";

/**
 * ============================================================================
 * Email Service
 * ============================================================================
 * Handles transactional email rendering and SMTP transmission for account
 * verification and password reset workflows. Executed asynchronously by BullMQ workers.
 */

/**
 * Options payload for sending account verification email.
 */
interface SendVerificationEmailOptions {
  email: string;
  firstName: string;
  verificationUrl: string;
}

/**
 * Options payload for sending password reset email.
 */
interface SendResetPasswordEmailOptions {
  email: string;
  resetPasswordUrl: string;
}

/**
 * ----------------------------------------------------------------------------
 * 1. Send Email Verification
 * ----------------------------------------------------------------------------
 * Renders HTML verification template and sends email via pooled SMTP transporter.
 *
 * @param options - Recipient email, first name, and one-time verification link
 * @returns SentMessageInfo object from Nodemailer
 */
export const sendVerificationEmail = async ({
  email,
  firstName,
  verificationUrl,
}: SendVerificationEmailOptions) => {
  try {
    logger.info({
      event: LOG_EVENTS.EMAIL_SENDING,
      component: "EmailService",
      email,
    });

    // Render shadcn-inspired responsive verification template
    const html = verificationEmailTemplate(firstName, verificationUrl);

    // Send email using pooled SMTP transporter
    const info = await transporter.sendMail({
      from: env.SMTP_USER,
      to: email,
      subject: "Verify your email address",
      html,
    });

    logger.info({
      event: LOG_EVENTS.EMAIL_SENT,
      component: "EmailService",
      email,
    });

    return info;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");

    logger.error({
      event: LOG_EVENTS.EMAIL_SEND_FAILED,
      component: "EmailService",
      email,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });

    throw err;
  }
};

/**
 * ----------------------------------------------------------------------------
 * 2. Send Password Reset Email
 * ----------------------------------------------------------------------------
 * Renders HTML password reset template and sends email via pooled SMTP transporter.
 *
 * @param options - Recipient email and one-time password reset link
 * @returns SentMessageInfo object from Nodemailer
 */
export const sendResetPasswordEmail = async ({
  email,
  resetPasswordUrl,
}: SendResetPasswordEmailOptions) => {
  try {
    logger.info({
      event: LOG_EVENTS.EMAIL_SENDING,
      component: "EmailService",
      email,
    });

    // Render shadcn-inspired responsive password reset template
    const html = resetPasswordEmailTemplate(resetPasswordUrl);

    // Send email using pooled SMTP transporter
    const info = await transporter.sendMail({
      from: env.SMTP_USER,
      to: email,
      subject: "IdentityForge Password Reset",
      html,
    });

    logger.info({
      event: LOG_EVENTS.EMAIL_SENT,
      component: "EmailService",
      email,
    });

    return info;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");

    logger.error({
      event: LOG_EVENTS.EMAIL_SEND_FAILED,
      component: "EmailService",
      email,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });

    throw err;
  }
};
