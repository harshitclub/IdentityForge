import { env } from "../config/env.js";
import { transporter } from "../config/mailer.js";
import { LOG_EVENTS } from "../constants/index.js";
import { logger } from "../shared/logging/logger.js";
import { resetPasswordEmailTemplate } from "./templates/reset-password.template.js";
import { verificationEmailTemplate } from "./templates/verify-email.template.js";

interface SendVerificationEmailOptions {
  email: string;
  firstName: string;
  verificationUrl: string;
}

interface SendResetPasswordEmailOptions {
  email: string;
  resetPasswordUrl: string;
}

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

    const html = verificationEmailTemplate(firstName, verificationUrl);

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

export const sendResetPasswordEmail = async ({
  email,
  resetPasswordUrl,
}: SendResetPasswordEmailOptions) => {
  try {
    logger.info(`Sending reset password email to ${email}`);

    const html = resetPasswordEmailTemplate(resetPasswordUrl);

    const info = await transporter.sendMail({
      from: env.SMTP_USER,
      to: email,
      subject: "IdentityForge Password Reset",
      html,
    });
    logger.info(
      `Reset password email sent to ${email}. Response: ${info.response}`,
    );
    return info;
  } catch (err) {
    logger.error("Reset password email failed", {
      email,
      error: err,
    });

    throw err;
  }
};
