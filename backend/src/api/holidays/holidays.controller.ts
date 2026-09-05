import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import { createHoliday, deleteHoliday, listHolidays } from './holidays.repository';

export const getHolidays = asyncHandler(async (_req, res) => {
  const data = await listHolidays();
  res.json(ok(data));
});

export const postHoliday = asyncHandler(async (req, res) => {
  const b = req.body;
  const holiday = await createHoliday({ date: b.date, reason: b.reason });
  res.status(201).json(ok(holiday));
});

export const removeHoliday = asyncHandler(async (req, res) => {
  const done = await deleteHoliday(req.params.id as string);
  if (!done) throw ApiError.notFound('Holiday not found');
  res.json(ok({ deleted: true }));
});
