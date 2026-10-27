import { Resend } from "resend";

import { env } from "@/env";

import { texts } from "../texts";

// Optional in dev: without RESEND_API_KEY emails are printed to the server
// console, so the whole auth flow stays testable with zero external setup.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface Email {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(email: Email): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — printing email instead.\n` +
        `To: ${email.to}\nSubject: ${email.subject}\n${email.html}`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
  });

  if (error) {
    throw new Error(`Failed to send email to ${email.to}: ${error.message}`);
  }
}

// Minimal transactional template — no external email framework needed.
function actionEmail({
  heading,
  body,
  url,
  action,
}: {
  heading: string;
  body: string;
  url: string;
  action: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;">
          <tr><td>
            <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">${heading}</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">${body}</p>
            <p style="margin:0 0 24px;">
              <a href="${url}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">${action}</a>
            </p>
            <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#71717a;word-break:break-all;">
              Or paste this link in your browser:<br /><a href="${url}" style="color:#18181b;">${url}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 24px;" />
            <p style="margin:0;font-size:12px;color:#a1a1aa;">${texts.emailIgnoreNote} — ${texts.appName}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function verifyEmailEmail(to: string, url: string): Email {
  return {
    to,
    subject: texts.verifyEmailSubject,
    html: actionEmail({
      heading: texts.verifyEmailHeading,
      body: texts.verifyEmailBody,
      url,
      action: texts.verifyEmailAction,
    }),
  };
}

export function resetPasswordEmail(to: string, url: string): Email {
  return {
    to,
    subject: texts.resetPasswordSubject,
    html: actionEmail({
      heading: texts.resetPasswordHeading,
      body: texts.resetPasswordBody,
      url,
      action: texts.resetPasswordAction,
    }),
  };
}
