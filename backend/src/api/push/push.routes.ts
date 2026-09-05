import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { ok } from '@/utils/ApiResponse';
import { query } from '@/config/db';
import { env } from '@/config/env';

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeQuery = z.object({
  endpoint: z.string().url(),
});

// Public — the frontend needs this before it can even build a subscription
// request, and a VAPID *public* key is, per its name, not a secret.
router.get(
  '/vapid-public-key',
  asyncHandler(async (_req, res) => {
    res.json(ok({ publicKey: env.VAPID_PUBLIC_KEY || null }));
  })
);

// Push is a back-office feature for now — admin + staff only, matching the
// project this is being built for (the original ask was specifically about
// staff not wanting to use WhatsApp/SMS, not customer-facing notifications).
router.post(
  '/subscribe',
  authenticate,
  requireRole('admin', 'staff'),
  validate(subscribeSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { endpoint, keys } = req.body as z.infer<typeof subscribeSchema>;
    // ON CONFLICT (endpoint): the same browser subscribing again (e.g.
    // after clearing permissions and re-enabling) just refreshes the row
    // rather than erroring or duplicating it.
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent`,
      [req.user.sub, endpoint, keys.p256dh, keys.auth, req.get('user-agent') ?? null]
    );
    res.json(ok({ subscribed: true }));
  })
);

router.delete(
  '/subscribe',
  authenticate,
  requireRole('admin', 'staff'),
  validate(unsubscribeQuery, 'query'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { endpoint } = req.query as unknown as z.infer<typeof unsubscribeQuery>;
    // Scoped to the caller's own user_id — a staff member can only ever
    // unsubscribe their own device, never someone else's by guessing an
    // endpoint URL.
    await query(`DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`, [
      endpoint,
      req.user.sub,
    ]);
    res.json(ok({ subscribed: false }));
  })
);

export default router;
