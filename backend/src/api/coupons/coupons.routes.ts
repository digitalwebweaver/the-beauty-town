import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import {
  getAllCoupons,
  getOneCoupon,
  patchCoupon,
  postCoupon,
  postPreviewCoupon,
} from './coupons.controller';
import { createCouponSchema, previewCouponSchema, updateCouponSchema } from './coupons.validator';

const router = Router();

// Staff need this to check a code against the live cart in Quick Bill —
// read-only, doesn't touch redemption counts.
router.post(
  '/preview',
  authenticate,
  requireRole('staff', 'admin'),
  validate(previewCouponSchema),
  postPreviewCoupon
);

// Everything else is admin-only management.
router.get('/', authenticate, requireRole('admin'), getAllCoupons);
router.post('/', authenticate, requireRole('admin'), validate(createCouponSchema), postCoupon);
router.get('/:id', authenticate, requireRole('admin'), getOneCoupon);
router.patch('/:id', authenticate, requireRole('admin'), validate(updateCouponSchema), patchCoupon);

export default router;
