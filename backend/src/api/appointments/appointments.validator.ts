import { z } from 'zod';
import { nameField, phoneField, uuidString } from '@/utils/zodHelpers';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM');

// staffId can be:
//   - a valid UUID (specific stylist)
//   - null / undefined / '' / 'any'  → auto-assign a free staff on the backend
const staffIdField = z.preprocess(
  (v) => (typeof v === 'string' && (v.trim() === '' || v.toLowerCase() === 'any') ? null : v),
  uuidString().nullable().optional()
);

export const createAppointmentSchema = z.object({
  staffId: staffIdField,
  appointmentDate: isoDate,
  startTime: time,
  serviceIds: z.array(uuidString()).min(1).max(10),
  packageId: uuidString().optional(),
  notes: z.string().max(500).optional(),
});

export const guestBookingSchema = createAppointmentSchema.extend({
  name: nameField(2, 120),
  phone: phoneField(),
  email: z.string().email().max(180).optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
});

export const transferSchema = z.object({
  newStaffId: uuidString(),
});

// Accepts however the client's query-string serializer shaped it: a real
// array (repeated `serviceIds=` / `serviceIds[]=` keys — Express's `qs`
// parser produces this either way) or a single bare value.
const serviceIdsField = z.preprocess(
  (v) => (v === undefined || v === '' ? undefined : Array.isArray(v) ? v : [v]),
  z.array(uuidString()).optional()
);

export const availabilityQuery = z.object({
  staffId: uuidString().optional(),
  date: isoDate,
  duration: z.coerce.number().int().min(5).max(600),
  serviceIds: serviceIdsField,
});
