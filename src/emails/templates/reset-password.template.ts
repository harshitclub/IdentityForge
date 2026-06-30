import { emailLayout } from "../layout/email-layout.js";

export const resetPasswordEmailTemplate = (resetPasswordUrl: string) => {
  const content = `
    <h2
      style="
        margin-top:0;
        color:#0f172a;
        font-size:24px;
      "
    >
      Reset your password
    </h2>

     <p>
      We received a request to reset the password for your account. Click the button below to create a new password.
    </p>

    <div style="margin:32px 0;">
      <a
        href="${resetPasswordUrl}"
        style="
          display:inline-block;
          background:#2563eb;
          color:#ffffff;
          text-decoration:none;
          padding:14px 28px;
          border-radius:5px;
          font-weight:600;
        "
      >
        Reset Password
      </a>
    </div>

     <p>
      This password reset link will expire in <strong>15 minutes</strong> for security reasons.
    </p>

     <p>
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
    `;

  return emailLayout({ title: "Reset Password", content });
};
