import { asyncHandler } from '@/utils/asyncHandler';
import { ok, paginated } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  busySlots,
  cancelAppointment,
  createAppointment,
  findOrCreateGuestCustomer,
  getAppointmentById,
  listAllAppointments,
  listMyAppointments,
  listStaffAppointments,
  transferAppointment,
  updateAppointmentStatus,
} from './appointments.service';

export const postAppointment = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const b = req.body;
  const appointment = await createAppointment({
    customerId: req.user.sub,
    staffId: b.staffId ?? null,
    appointmentDate: b.appointmentDate,
    startTime: b.startTime,
    serviceIds: b.serviceIds,
    packageId: b.packageId,
    notes: b.notes,
  });
  res.status(201).json(ok(appointment));
});

// Unauthenticated booking — resolves (or creates) a customer record from
// name/phone/email, then books through the exact same transactional path
// as a logged-in customer.
export const postGuestAppointment = asyncHandler(async (req, res) => {
  const b = req.body;
  const customerId = await findOrCreateGuestCustomer({
    name: b.name,
    phone: b.phone,
    email: b.email,
  });
  const appointment = await createAppointment({
    customerId,
    staffId: b.staffId ?? null,
    appointmentDate: b.appointmentDate,
    startTime: b.startTime,
    serviceIds: b.serviceIds,
    packageId: b.packageId,
    notes: b.notes,
  });
  res.status(201).json(ok(appointment));
});

export const getMyAppointments = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const { page, pageSize } = req.query as unknown as { page?: number; pageSize?: number };
  const {
    rows,
    total,
    paginate,
    page: p,
    pageSize: ps,
  } = await listMyAppointments(req.user.sub, { page, pageSize });
  res.json(paginate ? paginated(rows, p, ps, total) : ok(rows));
});

export const getStaffOwnAppointments = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const { page, pageSize } = req.query as unknown as { page?: number; pageSize?: number };
  const {
    rows,
    total,
    paginate,
    page: p,
    pageSize: ps,
  } = await listStaffAppointments(req.user.sub, { page, pageSize });
  res.json(paginate ? paginated(rows, p, ps, total) : ok(rows));
});

export const getAppointment = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const a = await getAppointmentById(req.params.id as string);
  if (!a) throw ApiError.notFound('Appointment not found');
  // Ownership check — a customer/staff account may only fetch its own
  // appointment; admin sees everything. 404 (not 403) so an unauthorized
  // caller can't distinguish "not yours" from "doesn't exist."
  const isOwner =
    req.user.role === 'admin' || a.customer_id === req.user.sub || a.staff_id === req.user.sub;
  if (!isOwner) throw ApiError.notFound('Appointment not found');
  res.json(ok(a));
});

export const getAllAppointments = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const q = req.query as unknown as {
    status?: string[];
    from?: string;
    to?: string;
    q?: string;
    staffId?: string;
    page?: number;
    pageSize?: number;
  };
  const isStaff = req.user.role === 'staff';
  // Staff can only see their own appointments, always.
  // Admin can see everything, or filter by ?staffId=... to see one staff.
  const staffId = isStaff ? req.user.sub : q.staffId;
  const { rows, total, paginate, page, pageSize } = await listAllAppointments({
    status: q.status,
    from: q.from,
    to: q.to,
    q: q.q,
    staffId,
    page: q.page,
    pageSize: q.pageSize,
  });
  res.json(paginate ? paginated(rows, page, pageSize, total) : ok(rows));
});

export const patchStatus = asyncHandler(async (req, res) => {
  const updated = await updateAppointmentStatus(req.params.id as string, req.body.status);
  res.json(ok(updated));
});

export const transfer = asyncHandler(async (req, res) => {
  const updated = await transferAppointment(req.params.id as string, req.body.newStaffId);
  res.json(ok(updated));
});

export const cancelMine = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const updated = await cancelAppointment(req.params.id as string, req.user.sub, req.body?.reason);
  res.json(ok(updated));
});

export const availability = asyncHandler(async (req, res) => {
  const staffId = req.query.staffId as string | undefined;
  const data = await busySlots({
    staffId: staffId && staffId !== 'any' ? staffId : undefined,
    date: req.query.date as string,
    durationMinutes: Number(req.query.duration),
    serviceIds: req.query.serviceIds as string[] | undefined,
  });
  res.json(ok(data));
});
