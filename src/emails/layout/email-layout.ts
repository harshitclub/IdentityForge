interface EmailLayoutProps {
  title: string;
  content: string;
}

export const emailLayout = ({ title, content }: EmailLayoutProps): string => {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fafafa; width: 100%; min-height: 100%; padding: 48px 16px;">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #f4f4f5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <!-- Minimalist Logo Badge -->
                          <div style="background-color: #18181b; color: #fafafa; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 4px;">
                            IF
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 17px; font-weight: 600; color: #09090b; letter-spacing: -0.02em;">
                            IdentityForge
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 500; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; background-color: #f4f4f5; border: 1px solid #e4e4e7; padding: 3px 8px; border-radius: 3px;">
                      Security
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 36px 32px 36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #fafafa; border-top: 1px solid #f4f4f5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 500; color: #3f3f46;">
                      Created by <span style="color: #09090b; font-weight: 600;">Harshit Kumar</span>
                    </p>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://github.com/harshitclub" target="_blank" style="display: inline-block; font-size: 12px; font-weight: 500; color: #71717a; text-decoration: none; border: 1px solid #e4e4e7; background-color: #ffffff; padding: 4px 12px; border-radius: 3px;">
                            GitHub: harshitclub
                          </a>
                        </td>
                        <td style="padding: 0 8px;">
                          <a href="https://linkedin.com/in/harshitclub" target="_blank" style="display: inline-block; font-size: 12px; font-weight: 500; color: #71717a; text-decoration: none; border: 1px solid #e4e4e7; background-color: #ffffff; padding: 4px 12px; border-radius: 3px;">
                            LinkedIn: in/harshitclub
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                      This is an automated security transmission from IdentityForge Authentication & Authorization Platform.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #a1a1aa;">
                      &copy; ${currentYear} IdentityForge. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
