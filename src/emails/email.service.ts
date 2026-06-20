import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { transporter } from "../config/mailer.js";
import { verificationEmailTemplate } from "./templates/verify-email.template.js";

interface SendVerificationEmailOptions {
  email: string;
  firstName: string;
  verificationUrl: string;
}

export const sendVerificationEmail = async ({
  email,
  firstName,
  verificationUrl,
}: SendVerificationEmailOptions) => {
  try {
    logger.info(`Sending verification email to ${email}`);

    const html = verificationEmailTemplate(firstName, verificationUrl);

    const info = await transporter.sendMail({
      from: env.SMTP_USER,
      to: email,
      subject: "Verify your email address",
      html,
    });

    logger.info(
      `Verification email sent to ${email}. Response: ${info.response}`,
    );

    return info;
  } catch (err) {
    logger.error("Verification email failed", {
      email,
      firstName,
      error: err,
    });

    throw err;
  }
};
