import { emailLayout } from "../layout/email-layout.js";

export const resetPasswordEmailTemplate = (
  resetPasswordUrl: string,
): string => {
  const content = `
    <!-- Header Title -->
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #09090b; letter-spacing: -0.025em; line-height: 1.3;">
      Reset your password
    </h2>

    <p style="margin: 0 0 24px 0; font-size: 14px; color: #71717a; line-height: 1.5;">
      A password reset request was initiated for your IdentityForge account.
    </p>

    <div style="height: 1px; background-color: #f4f4f5; margin: 0 0 24px 0;"></div>

    <!-- Message Body -->
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #27272a; line-height: 1.6;">
      We received a request to reset the password associated with this email address. Click the button below to choose a new password:
    </p>

    <!-- Primary Action Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 28px 0;">
      <tr>
        <td align="left">
          <a
            href="${resetPasswordUrl}"
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
            Reset Password &rarr;
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
            <strong style="color: #09090b;">Security Notice:</strong> This password reset link will expire in <strong>15 minutes</strong>. For your protection, your existing password remains active until you complete the reset.
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
        href="${resetPasswordUrl}"
        target="_blank"
        style="font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #2563eb; text-decoration: underline;"
      >
        ${resetPasswordUrl}
      </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
      If you did not request a password reset, no action is needed. Your account is completely secure.
    </p>
  `;

  return emailLayout({
    title: "Reset your password - IdentityForge",
    content,
  });
};
