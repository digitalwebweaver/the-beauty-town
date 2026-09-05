import webpush from 'web-push';
import { env } from '@/config/env';
import { query } from '@/config/db';
import { logger } from '@/config/logger';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path the notification should open/focus the app to on click. */
  url?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToSubscriptions(rows: SubscriptionRow[], payload: PushPayload): Promise<void> {
  if (!rows.length) return;
  if (!ensureConfigured()) {
    // Mirrors utils/email.ts's graceful no-op when SMTP isn't configured —
    // push is best-effort, never something that should fail the caller
    // (e.g. a booking shouldn't error out just because notifications
    // aren't set up in this environment).
    logger.info('🔕 Push skipped (VAPID not configured)', {
      title: payload.title,
      subscribers: rows.length,
    });
    return;
  }

  const body = JSON.stringify(payload);
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 is the push service's own way of saying "this
        // subscription is dead, stop trying it" — clean it up so it
        // isn't retried (and doesn't skew subscriber counts) forever.
        if (statusCode === 404 || statusCode === 410) {
          await query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]).catch(() => {});
        } else {
          logger.error('Push send failed', {
            subscriptionId: row.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })
  );
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const { rows } = await query<SubscriptionRow>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  await sendToSubscriptions(rows, payload);
}

export async function sendPushToRole(role: 'admin' | 'staff', payload: PushPayload): Promise<void> {
  const { rows } = await query<SubscriptionRow>(
    `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     JOIN users u ON u.id = ps.user_id
     WHERE u.role = $1 AND u.is_active = TRUE`,
    [role]
  );
  await sendToSubscriptions(rows, payload);
}
