import { z } from 'zod';
import { uuidString } from '@/utils/zodHelpers';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const listAuditLogsQuery = z.object({
  actorId: uuidString().optional(),
  action: z.string().max(80).optional(),
  targetType: z.string().max(40).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const auditStatsQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});
