import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const MAX_RANGE_DAYS = 400;

export const reportParams = z.object({
  type: z.enum(['sales', 'appointments', 'staff']),
});

export const reportQuery = z
  .object({
    from: isoDate,
    to: isoDate,
  })
  .refine((v) => v.from <= v.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  })
  .refine(
    (v) => {
      const days = (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000;
      return days <= MAX_RANGE_DAYS;
    },
    { message: `Date range can't exceed ${MAX_RANGE_DAYS} days`, path: ['to'] }
  );
