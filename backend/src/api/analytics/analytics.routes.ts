import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { getDashboardAnalytics } from './analytics.service';

const router = Router();

const ALLOWED_RANGES = [7, 30, 90, 365];

router.get(
  '/dashboard',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const raw = Number(req.query.range);
    const days = ALLOWED_RANGES.includes(raw) ? raw : 30;
    res.json(ok(await getDashboardAnalytics(days)));
  })
);

export default router;
