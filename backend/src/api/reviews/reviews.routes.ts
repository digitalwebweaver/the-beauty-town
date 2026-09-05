import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { query } from '@/config/db';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import { uuidString } from '@/utils/zodHelpers';

const router = Router();

const createSchema = z.object({
  staffId: uuidString().nullable().optional(),
  appointmentId: uuidString().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
});

// Public: list published reviews
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const staffId = (req.query.staffId as string | undefined) ?? null;
    const params: unknown[] = [];
    const where: string[] = ['r.is_published = TRUE'];
    if (staffId) {
      params.push(staffId);
      where.push(`r.staff_id = $${params.length}`);
    }
    const { rows } = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              r.customer_id, u.name AS customer_name, u.avatar_url AS customer_avatar,
              r.staff_id, s.name AS staff_name
       FROM reviews r
       JOIN users u ON u.id = r.customer_id
       LEFT JOIN users s ON s.id = r.staff_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.created_at DESC
       LIMIT 100`,
      params
    );
    res.json(ok(rows));
  })
);

// Customer creates a review
router.post(
  '/',
  authenticate,
  requireRole('customer'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const b = req.body as z.infer<typeof createSchema>;

    // A submitted appointmentId must actually belong to this customer —
    // otherwise any logged-in customer could attribute a review to any
    // appointment (and by extension any staff member) at all. When one is
    // given, trust ITS staff_id rather than whatever staffId the client
    // separately sent, so the two can't be mismatched.
    let staffId = b.staffId ?? null;
    if (b.appointmentId) {
      const appt = await query<{ staff_id: string | null }>(
        `SELECT staff_id FROM appointments WHERE id = $1 AND customer_id = $2`,
        [b.appointmentId, req.user.sub]
      );
      if (!appt.rowCount) {
        throw ApiError.badRequest("That appointment doesn't belong to you");
      }
      staffId = appt.rows[0].staff_id;
    }

    const { rows } = await query(
      `INSERT INTO reviews (customer_id, staff_id, appointment_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, rating, comment, created_at, staff_id`,
      [req.user.sub, staffId, b.appointmentId ?? null, b.rating, b.comment]
    );
    res.status(201).json(ok(rows[0]));
  })
);

export default router;
