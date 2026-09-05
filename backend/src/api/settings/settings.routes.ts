import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { getSettings, updateSettings } from './settings.repository';

const router = Router();

const urlOrEmpty = z
  .union([z.string().url(), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? null : v));

const updateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  tagline: z.string().max(200).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z
    .union([z.string().email(), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? null : v)),
  gstin: z.string().max(20).nullable().optional(),
  hours: z.string().max(150).nullable().optional(),
  instagramUrl: urlOrEmpty,
  facebookUrl: urlOrEmpty,
  otpLoginEnabled: z.boolean().optional(),
});

// Public — the storefront (Navbar/Footer) and printed receipts read this
// before anyone is logged in.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(ok(await getSettings()));
  })
);

// Admin-only write — this is core business identity, not day-to-day ops.
router.patch(
  '/',
  authenticate,
  requireRole('admin'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    res.json(ok(await updateSettings(req.body)));
  })
);

export default router;
