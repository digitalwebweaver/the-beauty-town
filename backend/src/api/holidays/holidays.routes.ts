import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { getHolidays, postHoliday, removeHoliday } from './holidays.controller';
import { createHolidaySchema } from './holidays.validator';

const router = Router();

// Public — the booking date-picker and the admin page both read the
// full list (the frontend filters to "from today" for the picker).
router.get('/', getHolidays);

router.post('/', authenticate, requireRole('admin'), validate(createHolidaySchema), postHoliday);
router.delete('/:id', authenticate, requireRole('admin'), removeHoliday);

export default router;
