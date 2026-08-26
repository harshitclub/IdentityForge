import { emailLayout } from "../layout/email-layout.js";

export const verificationEmailTemplate = (
  firstName: string,
  verificationUrl: string,
): string => {
  const content = `
    <!-- Header Title -->
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #09090b; letter-spacing: -0.025em; line-height: 1.3;">
      Verify your email address
    </h2>

    <p style="margin: 0 0 24px 0; font-size: 14px; color: #71717a; line-height: 1.5;">
      Complete your registration to secure and activate your IdentityForge account.
    </p>

    <div style="height: 1px; background-color: #f4f4f5; margin: 0 0 24px 0;"></div>

    <!-- Greeting & Message -->
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #27272a; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 28px 0; font-size: 14px; color: #3f3f46; line-height: 1.6;">
      Thank you for choosing IdentityForge. To complete your setup and confirm that this email address belongs to you, please click the verification button below:
    </p>

    <!-- Primary Action Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 28px 0;">
      <tr>
        <td align="left">
          <a
            href="${verificationUrl}"
            target="_blank"
            style="
              display: inline-block;
              background-color: #18181b;
              color: #fafafa;
              font-size: 14px;
              font-weight: 500;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 4px;
              letter-spacing: -0.01em;
              text-align: center;
              border: 1px solid #18181b;
            "
          >
            Verify Email Address &rarr;
          </a>
        </td>
      </tr>
    </table>

    <!-- Security Info Box -->
    <div
      style="
        background-color: #fafafa;
        border: 1px solid #e4e4e7;
        border-radius: 4px;
        padding: 16px;
        margin: 0 0 24px 0;
      "
    >
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="font-size: 13px; color: #3f3f46; line-height: 1.5;">
            <strong style="color: #09090b;">Important:</strong> This verification link is valid for <strong>15 minutes</strong> and can only be used once. If expired, you can request a new verification link from the login page.
          </td>
        </tr>
      </table>
    </div>

    <!-- Fallback Link Section -->
    <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a; line-height: 1.5;">
      If the button above does not work, copy and paste this link into your browser:
    </p>
    
    <div
      style="
        background-color: #f4f4f5;
        border: 1px solid #e4e4e7;
        border-radius: 4px;
        padding: 10px 12px;
        margin: 0 0 24px 0;
        word-break: break-all;
      "
    >
      <a
        href="${verificationUrl}"
        target="_blank"
        style="font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #2563eb; text-decoration: underline;"
      >
        ${verificationUrl}
      </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
      If you did not register for an IdentityForge account, you can safely disregard this email.
    </p>
  `;

  return emailLayout({
    title: "Verify your email address - IdentityForge",
    content,
  });
};
