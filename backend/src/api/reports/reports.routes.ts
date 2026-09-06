import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { reportGenerationLimiter } from '@/middlewares/rateLimiter';
import { getReport } from './reports.controller';
import { reportParams, reportQuery } from './reports.validator';

const router = Router();

// Admin-only — revenue and staff-performance data is sensitive. Returns a
// PDF file (Content-Disposition: attachment), not the usual JSON envelope.
router.get(
  '/:type',
  authenticate,
  requireRole('admin'),
  reportGenerationLimiter,
  validate(reportParams, 'params'),
  validate(reportQuery, 'query'),
  getReport
);

export default router;
