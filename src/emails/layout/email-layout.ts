interface EmailLayoutProps {
  title: string;
  content: string;
}

export const emailLayout = ({ title, content }: EmailLayoutProps): string => {
  return `
<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background-color:#f8fafc;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  "
>

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  style="
    background:#f8fafc;
    padding:40px 16px;
  "
>
<tr>
<td align="center">

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  style="
    max-width:600px;
    background:#ffffff;
    border-radius:5px;
    overflow:hidden;
    border:1px solid #e2e8f0;
  "
>

<!-- Header -->
<tr>
<td
  style="
    background:#ffffff;
    padding:32px;
    border-bottom:1px solid #e2e8f0;
    text-align:center;
  "
>

<h1
  style="
    margin:0;
    font-size:28px;
    color:#0f172a;
    font-weight:700;
  "
>
IdentityForge
</h1>

<p
  style="
    margin-top:8px;
    color:#64748b;
    font-size:14px;
  "
>
Secure Authentication & Authorization Platform
</p>

</td>
</tr>

<!-- Dynamic Content -->
<tr>
<td
  style="
    padding:40px 32px;
    color:#334155;
    line-height:1.7;
    font-size:16px;
  "
>

${content}

</td>
</tr>

<!-- Footer -->
<tr>
<td
  style="
    padding:24px 32px;
    background:#f8fafc;
    border-top:1px solid #e2e8f0;
    text-align:center;
  "
>

<p
  style="
    margin:0;
    color:#64748b;
    font-size:14px;
  "
>
Developed by Harshit Kumar
</p>

<p
  style="
    margin:12px 0 0;
  "
>
<a
  href="https://github.com/harshitclub"
  style="
    color:#2563eb;
    text-decoration:none;
    margin-right:16px;
  "
>
GitHub
</a>

<a
  href="https://linkedin.com/in/harshitclub"
  style="
    color:#2563eb;
    text-decoration:none;
  "
>
LinkedIn
</a>
</p>

<p
  style="
    margin-top:20px;
    font-size:12px;
    color:#94a3b8;
  "
>
© ${new Date().getFullYear()} IdentityForge. All rights reserved.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};
