import cron, { type ScheduledTask } from 'node-cron';
import { query } from '@/config/db';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { getSettings } from '@/api/settings/settings.repository';
import { sendUnconfirmedBookingAlertEmail } from '@/utils/email';
import { sendPushToRole } from '@/api/push/push.service';

// The "reminder to us" half of the appointment-notifications feature — a
// booking that's about to start and still hasn't been confirmed is exactly
// the kind of thing that should interrupt someone, not wait to be noticed.
// (The customer-facing 1-week/24h/2h reminder columns added alongside
// `unconfirmed_alert_sent_at` are reserved for a later pass — this job is
// scoped strictly to this one staff-facing alert for now.)

interface UnconfirmedRow {
  id: string;
  customer_name: string;
  staff_name: string | null;
  appointment_date: string;
  start_time: string;
  service_names: string[];
}

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeLabel(hms: string): string {
  const [hStr, mStr] = hms.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

export async function checkUnconfirmedBookings(): Promise<void> {
  const settings = await getSettings().catch(() => null);
  if (settings && !settings.appointment_notifications_enabled) return;

  // "Within 2 hours but still in the future" — a persistent range rather
  // than a narrow instant, so a missed cron tick (deploy, restart) doesn't
  // permanently skip an appointment; it'll still be caught on the next
  // tick as long as the slot hasn't started yet.
  const { rows } = await query<UnconfirmedRow>(
    `SELECT a.id, cu.name AS customer_name, st.name AS staff_name,
            a.appointment_date::text AS appointment_date, a.start_time::text AS start_time,
            COALESCE(
              (SELECT json_agg(s.name)
               FROM appointment_services asx
               JOIN services s ON s.id = asx.service_id
               WHERE asx.appointment_id = a.id),
              '[]'::json
            ) AS service_names
     FROM appointments a
     JOIN users cu ON cu.id = a.customer_id
     LEFT JOIN users st ON st.id = a.staff_id
     WHERE a.status = 'pending'
       AND a.unconfirmed_alert_sent_at IS NULL
       AND (a.appointment_date + a.start_time)::timestamp - NOW()::timestamp <= INTERVAL '2 hours'
       AND (a.appointment_date + a.start_time)::timestamp - NOW()::timestamp > INTERVAL '0 minutes'`
  );

  if (!rows.length) return;

  const adminEmail = settings?.email;

  for (const row of rows) {
    const timeLabel = formatTimeLabel(row.start_time);
    const serviceNames = row.service_names.length ? row.service_names : ['a booking'];
    try {
      if (adminEmail) {
        await sendUnconfirmedBookingAlertEmail(adminEmail, {
          customerName: row.customer_name,
          serviceNames,
          dateLabel: formatDateLabel(row.appointment_date),
          timeLabel,
          staffName: row.staff_name,
          manageUrl: `${env.CLIENT_URL}/admin/appointments`,
        });
      }
      await sendPushToRole('admin', {
        title: `Unconfirmed booking — ${row.customer_name}`,
        body: `${serviceNames.join(', ')} at ${timeLabel} is still unconfirmed.`,
        url: '/admin/appointments',
      });
      // Stamped last, and only after both sends attempted — if this row
      // somehow failed to update, the worst case is one duplicate alert
      // next tick, never a silently-skipped one.
      await query(`UPDATE appointments SET unconfirmed_alert_sent_at = NOW() WHERE id = $1`, [
        row.id,
      ]);
    } catch (err) {
      logger.error('Failed to send unconfirmed-booking alert', {
        appointmentId: row.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

let task: ScheduledTask | null = null;

export function startAppointmentNotificationsJob(): void {
  if (task) return;
  // Every 15 minutes — frequent enough to reliably catch the 2-hour
  // window, infrequent enough that it's never noticeable load. `noOverlap`
  // skips a tick instead of stacking it if a previous run is still going
  // (e.g. a slow email/push send) — without it, two overlapping runs could
  // both see the same unconfirmed_alert_sent_at IS NULL rows and each
  // send a duplicate alert.
  task = cron.schedule(
    '*/15 * * * *',
    () => {
      checkUnconfirmedBookings().catch((err) => {
        logger.error('appointmentNotifications job failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    },
    { noOverlap: true }
  );
  logger.info('🕐 appointmentNotifications job started (every 15 min)');
}

export function stopAppointmentNotificationsJob(): void {
  task?.stop();
  task = null;
}
