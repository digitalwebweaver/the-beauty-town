import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import { setAuditContext } from '@/utils/auditContext';
import { authenticate, optionalAuth } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { query } from '@/config/db';
import { imageRef, nameField, phoneField } from '@/utils/zodHelpers';
import {
  createStaff,
  deactivateStaff,
  findStaffById,
  listStaff,
  saveAvailability,
  updateStaff,
} from './staff.repository';

const router = Router();

const specialties = z.array(z.string().min(1).max(32)).max(10);

const createSchema = z.object({
  name: nameField(2, 120),
  email: z.string().email().max(180),
  phone: phoneField().optional(),
  password: z.string().min(6).max(128),
  roleTitle: z.string().min(2).max(120),
  bio: z.string().max(1000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
  specialties: specialties.default([]),
  avatarUrl: imageRef().optional(),
});

const updateSchema = z.object({
  name: nameField(2, 120).optional(),
  phone: phoneField().optional(),
  avatarUrl: imageRef().optional(),
  roleTitle: z.string().min(2).max(120).optional(),
  bio: z.string().max(1000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
  specialties: specialties.optional(),
});

// List — public sees active only; admin can include inactive
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const includeInactive = isAdmin && String(req.query.includeInactive ?? '') === 'true';
    const data = await listStaff({ includeInactive });
    res.json(ok(data));
  })
);

// List staff who are FREE during a given time window on a given date.
// Used by the "Transfer appointment" dialog to only show staff that
// won't cause an overlap. Route ordered BEFORE `/:id`.
router.get(
  '/available',
  authenticate,
  requireRole('admin', 'staff'),
  asyncHandler(async (req, res) => {
    const date = req.query.date as string;
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    const exclude = (req.query.exclude as string) ?? null;
    if (!date || !startTime || !endTime)
      throw ApiError.badRequest('date, startTime, endTime required');

    const { rows } = await query(
      `SELECT sp.user_id, u.name, u.avatar_url, sp.role_title, sp.rating
       FROM staff_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE u.role = 'staff' AND u.is_active AND sp.is_active
         AND ($4::uuid IS NULL OR sp.user_id != $4::uuid)
         AND NOT EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.staff_id = sp.user_id
             AND a.appointment_date = $1::date
             AND a.status NOT IN ('cancelled', 'no_show')
             AND tsrange(
               (a.appointment_date + a.start_time)::timestamp,
               (a.appointment_date + a.end_time)::timestamp
             ) && tsrange(
               ($1::date + $2::time)::timestamp,
               ($1::date + $3::time)::timestamp
             )
         )
       ORDER BY sp.rating DESC, u.name ASC`,
      [date, startTime, endTime, exclude]
    );
    res.json(ok(rows));
  })
);

// A staff member's own weekly availability — read + upsert. Route ordered
// BEFORE `/:id` for the same reason as `/available` above.
const DAY_LABEL_BY_INDEX = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

router.get(
  '/availability',
  authenticate,
  requireRole('staff'),
  asyncHandler(async (req, res) => {
    const { rows } = await query<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
    }>(
      `SELECT day_of_week, start_time, end_time, is_available
       FROM staff_availability
       WHERE staff_user_id = $1
       ORDER BY day_of_week`,
      [req.user!.sub]
    );
    res.json(
      ok(
        rows.map((r) => ({
          dayOfWeek: r.day_of_week,
          dayLabel: DAY_LABEL_BY_INDEX[r.day_of_week],
          startTime: r.start_time,
          endTime: r.end_time,
          isAvailable: r.is_available,
        }))
      )
    );
  })
);

const availabilitySchema = z.object({
  days: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        isAvailable: z.boolean(),
        startTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')
          .default('10:00'),
        endTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')
          .default('19:00'),
      })
    )
    .min(1)
    .max(7),
});

router.put(
  '/availability',
  authenticate,
  requireRole('staff'),
  validate(availabilitySchema),
  asyncHandler(async (req, res) => {
    const { days } = req.body as z.infer<typeof availabilitySchema>;
    await saveAvailability(req.user!.sub, days);
    res.json(ok({ saved: true }));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const s = await findStaffById(req.params.id as string);
    if (!s) throw ApiError.notFound('Staff not found');
    res.json(ok(s));
  })
);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const staff = await createStaff(req.body);
    res.status(201).json(ok(staff));
  })
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const staff = await updateStaff(req.params.id as string, req.body);
    res.json(ok(staff));
  })
);

// Soft delete = deactivate. Real deletes are unsafe (FK to appointments).
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    await deactivateStaff(id);
    setAuditContext(req, { action: 'staff.deactivated', targetType: 'user', targetId: id });
    res.json(ok({ deactivated: true }));
  })
);

export default router;
