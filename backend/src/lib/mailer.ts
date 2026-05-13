import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let cachedTransporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  if (!env.SMTP_HOST) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });

  return cachedTransporter;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export async function sendPayslipNotification(
  toEmail: string,
  employeeName: string,
  month: number,
  year: number,
): Promise<void> {
  const period = `${monthName(month)} ${year}`;
  const link = `${env.PORTAL_URL.replace(/\/+$/, '')}/finance`;
  const subject = `Your payslip for ${period} is ready`;

  const text = [
    `Hi ${employeeName},`,
    '',
    `Your salary slip for ${period} has been uploaded to the Employee Portal.`,
    '',
    `View and download it here: ${link}`,
    '',
    '— Employee Portal',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1f2937; line-height: 1.5;">
  <p>Hi ${escapeHtml(employeeName)},</p>
  <p>Your salary slip for <strong>${escapeHtml(period)}</strong> has been uploaded to the Employee Portal.</p>
  <p>
    <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">
      View payslip
    </a>
  </p>
  <p style="color:#6b7280;font-size:13px;margin-top:24px;">— Employee Portal</p>
</body></html>`;

  const transporter = getTransporter();

  if (!transporter) {
    console.log(
      `[mailer] SMTP not configured — would send: to=${toEmail} subject="${subject}" link=${link}`,
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject,
      text,
      html,
    });
    console.log(`[mailer] payslip notification sent to ${toEmail} (${period})`);
  } catch (err) {
    console.error(`[mailer] failed to send payslip notification to ${toEmail}:`, err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
