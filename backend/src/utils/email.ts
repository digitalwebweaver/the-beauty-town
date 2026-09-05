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

// Shared wrapper so every appointment-related email looks the same —
// salon name header, one message, one optional call-to-action button.
function appointmentEmailHtml(
  salonName: string,
  bodyHtml: string,
  cta?: { label: string; url: string }
) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #d63384;">${salonName}</h2>
      ${bodyHtml}
      ${
        cta
          ? `<div style="margin: 24px 0;">
               <a href="${cta.url}" style="display: inline-block; background: #d63384; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">${cta.label}</a>
             </div>`
          : ''
      }
    </div>
  `;
}

export interface AppointmentEmailDetails {
  customerName: string;
  serviceNames: string[];
  dateLabel: string;
  timeLabel: string;
  staffName?: string | null;
}

// `label` distinguishes the three reminder horizons in the subject/copy —
// "in 1 week" / "tomorrow" / "in 2 hours" — same template otherwise.
export async function sendAppointmentReminderEmail(
  email: string,
  label: string,
  details: AppointmentEmailDetails
) {
  const salonName = (await getSettings().catch(() => null))?.name ?? 'The Beauty Town';
  const services = details.serviceNames.join(', ');
  await sendEmail({
    to: email,
    subject: `Reminder: your appointment is ${label} — ${salonName}`,
    text: `Hi ${details.customerName}, this is a reminder that your appointment for ${services} is ${label}, on ${details.dateLabel} at ${details.timeLabel}${details.staffName ? ` with ${details.staffName}` : ''}. See you soon!`,
    html: appointmentEmailHtml(
      salonName,
      `<p>Hi ${details.customerName},</p>
       <p>Just a reminder — your appointment is <strong>${label}</strong>:</p>
       <div style="padding: 16px; background: #faf0f4; border-radius: 8px; margin: 16px 0;">
         <p style="margin: 0 0 6px;"><strong>${services}</strong></p>
         <p style="margin: 0; color: #666;">${details.dateLabel} at ${details.timeLabel}${details.staffName ? ` · with ${details.staffName}` : ''}</p>
       </div>
       <p style="color: #666;">Need to reschedule? Just get in touch and we'll sort it out.</p>`
    ),
  });
}

export async function sendAppointmentFollowupEmail(
  email: string,
  details: Pick<AppointmentEmailDetails, 'customerName' | 'serviceNames'> & { reviewUrl?: string }
) {
  const salonName = (await getSettings().catch(() => null))?.name ?? 'The Beauty Town';
  const services = details.serviceNames.join(', ');
  await sendEmail({
    to: email,
    subject: `Thanks for visiting ${salonName}!`,
    text: `Hi ${details.customerName}, thank you for visiting us for ${services}. We hope you loved it!${details.reviewUrl ? ` Tell us how it went: ${details.reviewUrl}` : ''}`,
    html: appointmentEmailHtml(
      salonName,
      `<p>Hi ${details.customerName},</p>
       <p>Thank you for visiting us for <strong>${services}</strong> — we hope you loved it!</p>
       ${details.reviewUrl ? `<p style="color: #666;">A quick review helps other clients find us, and helps our team improve.</p>` : ''}`,
      details.reviewUrl ? { label: 'Leave a review', url: details.reviewUrl } : undefined
    ),
  });
}

export async function sendRebookingNudgeEmail(
  email: string,
  details: { customerName: string; serviceNames: string[]; bookUrl: string }
) {
  const salonName = (await getSettings().catch(() => null))?.name ?? 'The Beauty Town';
  const services = details.serviceNames.join(', ');
  await sendEmail({
    to: email,
    subject: `It's been a while — time for your next ${services}?`,
    text: `Hi ${details.customerName}, it's been a little while since your last ${services} with us. Ready to book your next one? ${details.bookUrl}`,
    html: appointmentEmailHtml(
      salonName,
      `<p>Hi ${details.customerName},</p>
       <p>It's been a little while since your last <strong>${services}</strong> with us — based on how often you usually visit, you're about due for your next one!</p>`,
      { label: 'Book your next visit', url: details.bookUrl }
    ),
  });
}

// "Reminder to us" — an unconfirmed booking closing in fast is exactly the
// kind of thing that should interrupt someone rather than wait to be
// noticed in the dashboard, so this goes to the salon's own contact email.
export async function sendUnconfirmedBookingAlertEmail(
  adminEmail: string,
  details: AppointmentEmailDetails & { manageUrl: string }
) {
  const salonName = (await getSettings().catch(() => null))?.name ?? 'The Beauty Town';
  const services = details.serviceNames.join(', ');
  await sendEmail({
    to: adminEmail,
    subject: `Unconfirmed booking in 2 hours — ${details.customerName}`,
    text: `${details.customerName}'s booking for ${services} at ${details.timeLabel} today is still unconfirmed. Manage it: ${details.manageUrl}`,
    html: appointmentEmailHtml(
      salonName,
      `<p>Heads up — this booking is coming up in about 2 hours and hasn't been confirmed yet:</p>
       <div style="padding: 16px; background: #fff3cd; border-radius: 8px; margin: 16px 0;">
         <p style="margin: 0 0 6px;"><strong>${details.customerName}</strong> — ${services}</p>
         <p style="margin: 0; color: #666;">${details.dateLabel} at ${details.timeLabel}${details.staffName ? ` · with ${details.staffName}` : ''}</p>
       </div>`,
      { label: 'Review this booking', url: details.manageUrl }
    ),
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
