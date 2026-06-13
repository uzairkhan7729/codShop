import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/lib/env';

/**
 * Thin mailer wrapper. Falls back to logging emails to the console when SMTP is
 * not configured — so notifications never crash the app in development.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.info(`📧 [mail:console] To: ${message.to} | Subject: ${message.subject}`);
    return;
  }
  await tx.sendMail({ from: env.EMAIL_FROM, ...message });
}
