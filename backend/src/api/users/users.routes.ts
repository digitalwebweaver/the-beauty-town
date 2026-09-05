import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { query, withTransaction } from '@/config/db';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import { imageRef, nameField, phoneField, uuidString } from '@/utils/zodHelpers';
import { createAppointment } from '@/api/appointments/appointments.service';

const router = Router();

const patchMeSchema = z.object({
  name: nameField(2, 120).optional(),
  phone: phoneField().optional(),
  avatarUrl: imageRef().optional(),
  notificationPrefs: z
    .object({
      appointmentReminders: z.boolean().optional(),
      promotionalOffers: z.boolean().optional(),
      newsletter: z.boolean().optional(),
    })
    .optional(),
});

// Update own profile (any authenticated user)
router.patch(
  '/me',
  authenticate,
  validate(patchMeSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const b = req.body as z.infer<typeof patchMeSchema>;
    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (col: string, val: unknown) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };
    if (b.name !== undefined) push('name', b.name);
    if (b.phone !== undefined) push('phone', b.phone);
    if (b.avatarUrl !== undefined) push('avatar_url', b.avatarUrl);
    // Merge (not replace) so toggling one preference doesn't clobber the
    // other two — same JSONB-merge idiom as coupon_template_design's design blob.
    if (b.notificationPrefs !== undefined) {
      params.push(JSON.stringify(b.notificationPrefs));
      sets.push(`notification_prefs = notification_prefs || $${params.length}::jsonb`);
    }
    if (!sets.length) return res.json(ok({ updated: false }));

    params.push(req.user.sub);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, name, email, phone, role, avatar_url, notification_prefs, created_at`,
      params
    );
    res.json(
      ok({
        user: {
          id: rows[0].id,
          name: rows[0].name,
          email: rows[0].email,
          phone: rows[0].phone,
          role: rows[0].role,
          avatarUrl: rows[0].avatar_url,
          notificationPrefs: rows[0].notification_prefs,
          createdAt: rows[0].created_at,
        },
      })
    );
  })
);

// Admin + staff: list customers with lifetime value + visit count. Staff
// need read access here too — it's how the "book for a customer" flow
// looks up an existing customer by phone before creating a duplicate.
router.get(
  '/customers',
  authenticate,
  requireRole('admin', 'staff'),
  asyncHandler(async (_req, res) => {
    // "Visits" stays booking-based (completed appointments). "Lifetime
    // value" is actual money collected — completed sales, not the quoted
    // price on an appointment — including pure walk-in POS purchases with
    // no appointment at all, matched by customer_id or (for older tickets
    // rung up before the link existed) the same phone-last-10-digits
    // comparison used everywhere else in the app.
    const { rows } = await query(
      `SELECT u.id,
              u.name,
              u.email,
              u.phone,
              u.avatar_url,
              u.created_at,
              COALESCE(av.visits, 0) AS visits,
              COALESCE(sv.lifetime, 0) AS lifetime_inr
       FROM users u
       LEFT JOIN (
         SELECT customer_id, COUNT(*) AS visits
         FROM appointments
         WHERE status = 'completed'
         GROUP BY customer_id
       ) av ON av.customer_id = u.id
       LEFT JOIN LATERAL (
         SELECT SUM(s.total_inr) AS lifetime
         FROM sales s
         WHERE s.status = 'completed'
           AND (
             s.customer_id = u.id
             OR (
               s.customer_id IS NULL AND u.phone IS NOT NULL
               AND right(regexp_replace(s.customer_phone, '\\D', '', 'g'), 10)
                 = right(regexp_replace(u.phone, '\\D', '', 'g'), 10)
             )
           )
       ) sv ON true
       WHERE u.role = 'customer'
       ORDER BY lifetime_inr DESC, u.created_at DESC
       LIMIT 500`
    );
    res.json(ok(rows));
  })
);

// Admin: get one customer's full history — appointments booked AND actual
// bills rung up (which is what "how much have they paid" really means;
// an appointment's total_inr is just the quoted price, and a customer can
// also have pure walk-in POS purchases with no appointment at all).
router.get(
  '/customers/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;

    const userRes = await query(
      `SELECT id, name, email, phone, avatar_url, created_at, is_active, last_login_at
       FROM users
       WHERE id = $1 AND role = 'customer'`,
      [id]
    );
    if (!userRes.rowCount) throw ApiError.notFound('Customer not found');
    const customer = userRes.rows[0];

    const apptsRes = await query(
      `SELECT a.id,
              a.appointment_date,
              a.start_time,
              a.end_time,
              a.status,
              a.total_inr,
              a.notes,
              a.created_at,
              st.name AS staff_name,
              COALESCE(
                (SELECT json_agg(s.name)
                 FROM appointment_services asx
                 JOIN services s ON s.id = asx.service_id
                 WHERE asx.appointment_id = a.id),
                '[]'::json
              ) AS service_names
       FROM appointments a
       LEFT JOIN users st ON st.id = a.staff_id
       WHERE a.customer_id = $1
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [id]
    );

    // Sales linked by customer_id (the normal case going forward), plus —
    // for older/POS-only tickets rung up before a link was made — any sale
    // whose snapshot phone matches this customer's own phone, same
    // last-10-digits comparison used everywhere else in the app (guest
    // booking dedup, etc.) so formatting differences never cause a miss.
    const salesRes = await query(
      `SELECT s.id, s.appointment_id, s.staff_id, st.name AS staff_name,
              s.subtotal_inr, s.discount_inr, s.total_inr, s.status,
              s.coupon_code, s.coupon_discount_inr, s.created_at,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count,
              COALESCE(
                (SELECT json_agg(si.name_at_sale) FROM sale_items si WHERE si.sale_id = s.id),
                '[]'::json
              ) AS item_names,
              COALESCE(
                (SELECT json_agg(json_build_object('method', sp.method, 'amount', sp.amount_inr))
                 FROM sale_payments sp WHERE sp.sale_id = s.id),
                '[]'::json
              ) AS payments
       FROM sales s
       LEFT JOIN users st ON st.id = s.staff_id
       WHERE s.customer_id = $1
          OR (
            s.customer_id IS NULL AND $2::text IS NOT NULL
            AND right(regexp_replace(s.customer_phone, '\\D', '', 'g'), 10)
              = right(regexp_replace($2, '\\D', '', 'g'), 10)
          )
       ORDER BY s.created_at DESC`,
      [id, customer.phone]
    );

    const appts = apptsRes.rows;
    const sales = salesRes.rows;
    const completedSales = sales.filter((s) => s.status === 'completed');
    const totalSpend = completedSales.reduce((sum, s) => sum + Number(s.total_inr), 0);

    const stats = {
      totalVisits: appts.length,
      completed: appts.filter((a) => a.status === 'completed').length,
      upcoming: appts.filter((a) => ['pending', 'confirmed', 'in_progress'].includes(a.status))
        .length,
      cancelled: appts.filter((a) => ['cancelled', 'no_show'].includes(a.status)).length,
      totalBills: completedSales.length,
      totalSpend_inr: totalSpend,
      avgBill_inr: completedSales.length ? totalSpend / completedSales.length : 0,
      // Sales are already newest-first; appointments are too — just take
      // whichever of the two most-recent dates is later.
      lastVisitAt:
        [sales[0]?.created_at, appts[0]?.created_at].filter(Boolean).sort().reverse()[0] ?? null,
      // Kept for backward compatibility with the /customers list's own
      // appointment-based figure — the real lifetime spend is totalSpend_inr.
      lifetime_inr: appts
        .filter((a) => a.status === 'completed')
        .reduce((s, a) => s + Number(a.total_inr), 0),
    };

    res.json(
      ok({
        customer,
        stats,
        appointments: appts,
        sales,
      })
    );
  })
);

// Admin: create walk-in customer (with optional service visit)
const walkInSchema = z.object({
  name: nameField(2, 120),
  email: z.string().email().max(180).optional(),
  phone: phoneField().optional(),
  visit: z
    .object({
      serviceIds: z.array(uuidString()).min(1).max(10),
      staffId: uuidString().nullable().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
      notes: z.string().max(500).optional(),
    })
    .optional(),
});

router.post(
  '/customers',
  authenticate,
  requireRole('admin'),
  validate(walkInSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof walkInSchema>;

    // If admin didn't provide email, generate an internal placeholder so
    // the DB unique + not-null constraint is satisfied.
    const email =
      b.email ??
      `walkin_${Date.now()}_${crypto.randomBytes(3).toString('hex')}@internal.thebeautytown`;

    // 1. Create the customer row
    const customer = await withTransaction(async (client) => {
      try {
        const { rows } = await client.query(
          `INSERT INTO users (name, email, phone, role, email_verified)
           VALUES ($1, $2, $3, 'customer', $4)
           RETURNING id, name, email, phone, avatar_url, created_at`,
          [b.name, email, b.phone ?? null, !!b.email]
        );
        return rows[0];
      } catch (err: any) {
        if (err?.code === '23505') {
          throw ApiError.conflict('That email is already registered');
        }
        throw err;
      }
    });

    // 2. If admin also logged a visit, create the appointment as 'completed'
    let appointment = null;
    if (b.visit) {
      appointment = await createAppointment({
        customerId: customer.id,
        staffId: b.visit.staffId ?? null,
        appointmentDate: b.visit.date,
        startTime: b.visit.startTime,
        serviceIds: b.visit.serviceIds,
        notes: b.visit.notes,
      });
      await query(
        `UPDATE appointments
         SET status = 'completed', completed_at = NOW()
         WHERE id = $1`,
        [appointment.id]
      );
    }

    res.status(201).json(ok({ customer, appointment }));
  })
);

export default router;
