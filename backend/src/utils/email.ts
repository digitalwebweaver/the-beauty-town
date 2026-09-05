import nodemailer, { Transporter } from 'nodemailer';
import { env, isDev } from '@/config/env';
import { logger } from '@/config/logger';
import { getSettings } from '@/api/settings/settings.repository';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const t = getTransporter();
  if (!t) {
    // The preview below can contain a live OTP/reset code (see
    // sendOtpEmail/sendPasswordResetEmail) — only ever log it in dev.
    // In production with SMTP unconfigured, the email is silently
    // dropped rather than the code leaking into logs.
    if (isDev) {
      logger.info('📧 [DEV] Email skipped (no SMTP configured)', {
        to: opts.to,
        subject: opts.subject,
        preview: opts.text ?? opts.html.replace(/<[^>]+>/g, '').slice(0, 200),
      });
    }
    return;
  }
  await t.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

export async function sendPasswordResetEmail(email: string, otp: string, ttlMinutes: number) {
  const salonName = (await getSettings().catch(() => null))?.name ?? 'The Beauty Town';
  await sendEmail({
    to: email,
    subject: `Reset your password — ${salonName}`,
    text: `Your password reset code is ${otp}. It expires in ${ttlMinutes} minutes. If you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #d63384;">${salonName}</h2>
        <p>Hi,</p>
        <p>Use this code to reset your password:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 16px 24px; background: #faf0f4; border-radius: 8px; text-align: center; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #666;">This code expires in ${ttlMinutes} minutes. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
      </div>
    `,
  });
}

export async function sendOtpEmail(email: string, otp: string) {
  const salonName = (await getSettings().catch(() => null))?.name ?? 'The Beauty Town';
  await sendEmail({
    to: email,
    subject: `Your login code — ${salonName}`,
    text: `Your login code is ${otp}. It expires in ${env.OTP_TTL_MINUTES} minutes.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #d63384;">${salonName}</h2>
        <p>Hi,</p>
        <p>Your one-time login code is:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 16px 24px; background: #faf0f4; border-radius: 8px; text-align: center; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #666;">This code expires in ${env.OTP_TTL_MINUTES} minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
