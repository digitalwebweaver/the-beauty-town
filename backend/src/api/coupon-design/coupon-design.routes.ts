import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { getCouponDesign, saveCouponDesign } from './coupon-design.repository';

const router = Router();

// Loose but real validation — the frontend owns the exact element shape,
// this just guards against garbage reaching the column (wrong types, a
// runaway element count, absurd canvas sizes).
const elementSchema = z
  .object({
    id: z.string().min(1).max(60),
    type: z.enum(['text', 'image', 'shape', 'qrcode']),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
    binding: z.string().max(30).optional(),
    text: z.string().max(200).optional(),
    fontSize: z.number().positive().max(200).optional(),
    fontWeight: z.number().optional(),
    color: z.string().max(30).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    fontFamily: z.enum(['sans', 'serif', 'mono']).optional(),
    src: z.string().max(500).nullable().optional(),
    fit: z.enum(['cover', 'contain']).optional(),
    borderRadius: z.number().min(0).max(200).optional(),
    opacity: z.number().min(0).max(1).optional(),
    shape: z.enum(['rect', 'circle']).optional(),
    fill: z.string().max(30).optional(),
  })
  .passthrough();

const designSchema = z.object({
  width: z.number().min(100).max(2000),
  height: z.number().min(60).max(2000),
  backgroundColor: z.string().max(30),
  backgroundImageUrl: z.string().max(500).nullable().optional(),
  elements: z.array(elementSchema).max(60),
});

const updateSchema = z.object({ design: designSchema });

// Admin-only — this is a shared, salon-wide layout, not per-user data. The
// only screens that read it (the designer and the printable coupon dialog)
// already live behind the admin Coupons page.
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    res.json(ok(await getCouponDesign()));
  })
);

router.put(
  '/',
  authenticate,
  requireRole('admin'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    res.json(ok(await saveCouponDesign(req.body.design, req.user!.sub)));
  })
);

export default router;
