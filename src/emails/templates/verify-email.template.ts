import { emailLayout } from "../layout/email-layout.js";

export const verificationEmailTemplate = (
  firstName: string,
  verificationUrl: string,
) => {
  const content = `
    <h2
      style="
        margin-top:0;
        color:#0f172a;
        font-size:24px;
      "
    >
      Verify your email address
    </h2>

    <p>
      Hi ${firstName},
    </p>

    <p>
      Please verify your email address to activate your account.
    </p>

    <div style="margin:32px 0;">
      <a
        href="${verificationUrl}"
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
        Verify Email
      </a>
    </div>

    <p>
      This link will expire in 15 minutes.
    </p>

    <p>
      If you did not request the re-verification of this account, you can safely ignore this email.
    </p>
  `;

  return emailLayout({
    title: "Verify Email",
    content,
  });
};
