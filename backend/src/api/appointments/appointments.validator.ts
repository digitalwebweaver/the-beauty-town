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

// Both left un-defaulted on purpose. `/appointments` is shared by several
// widget-style callers that intentionally want EVERY row matching a
// naturally-bounded filter with no pagination UI of their own (today's
// board, this week's schedule, a staff dashboard's counts) as well as the
// two admin/staff tables that genuinely need real paging over a
// potentially large, loosely-filtered result set. Passing neither param
// returns every matching row (no LIMIT at all, same as before this pass
// except no longer silently capped at 500); passing either one switches
// into paginated mode. Same dual-mode shape as users.routes.ts's
// /customers.
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

// Own-appointments listings (customer's "mine", staff's "staff/mine") take
// no filters beyond pagination — kept as their own schema (rather than
// reusing listAllAppointmentsQuery) so a stray ?status=... on those routes
// doesn't silently get accepted and ignored.
export const myAppointmentsQuery = pageQuery;

// One status, several (repeated `status=` keys, e.g. an "upcoming" tab
// filtering to pending+confirmed+in_progress at once), or omitted — same
// bare-value-or-array normalization as serviceIdsField above.
const statusField = z.preprocess(
  (v) => (v === undefined || v === '' ? undefined : Array.isArray(v) ? v : [v]),
  z
    .array(z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']))
    .min(1)
    .optional()
);

export const listAllAppointmentsQuery = pageQuery.extend({
  status: statusField,
  from: isoDate.optional(),
  to: isoDate.optional(),
  q: z.string().max(120).optional(),
  staffId: uuidString().optional(),
});
