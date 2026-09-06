import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok, paginated } from '@/utils/ApiResponse';
import { getAuditStats, listAuditLogs } from './audit.service';
import { auditStatsQuery, listAuditLogsQuery } from './audit.validator';

const router = Router();

// Admin-only — more sensitive than the Reports module's financial data:
// this is a trail of every admin/staff action, not just numbers.
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  validate(listAuditLogsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listAuditLogsQuery>;
    const { rows, total } = await listAuditLogs(q);
    res.json(paginated(rows, q.page, q.pageSize, total));
  })
);

router.get(
  '/stats',
  authenticate,
  requireRole('admin'),
  validate(auditStatsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as z.infer<typeof auditStatsQuery>;
    res.json(ok(await getAuditStats(days)));
  })
);

export default router;
