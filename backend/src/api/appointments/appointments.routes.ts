import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { requireRole } from '@/middlewares/role';
import { validate } from '@/middlewares/validate';
import { guestBookingLimiter } from '@/middlewares/rateLimiter';
import {
  availability,
  cancelMine,
  getAllAppointments,
  getAppointment,
  getMyAppointments,
  getStaffOwnAppointments,
  patchStatus,
  postAppointment,
  postGuestAppointment,
  transfer,
} from './appointments.controller';
import {
  availabilityQuery,
  cancelAppointmentSchema,
  createAppointmentSchema,
  guestBookingSchema,
  listAllAppointmentsQuery,
  myAppointmentsQuery,
  transferSchema,
  updateStatusSchema,
} from './appointments.validator';

const router = Router();

// Public: check unavailable slots for a given date + duration (and optional staffId)
router.get('/availability', validate(availabilityQuery, 'query'), availability);

// Customer
router.post(
  '/',
  authenticate,
  requireRole('customer'),
  validate(createAppointmentSchema),
  postAppointment
);

// Guest — no account needed. Resolves/creates the customer record from
// name/phone/email, then books through the same transactional path.
router.post('/guest', guestBookingLimiter, validate(guestBookingSchema), postGuestAppointment);
router.get(
  '/mine',
  authenticate,
  requireRole('customer'),
  validate(myAppointmentsQuery, 'query'),
  getMyAppointments
);
router.patch(
  '/:id/cancel',
  authenticate,
  requireRole('customer'),
  validate(cancelAppointmentSchema),
  cancelMine
);

// Staff
router.get(
  '/staff/mine',
  authenticate,
  requireRole('staff'),
  validate(myAppointmentsQuery, 'query'),
  getStaffOwnAppointments
);

// Admin / staff status update
router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin', 'staff'),
  validate(updateStatusSchema),
  patchStatus
);

// Transfer an appointment to another staff (leave / emergency handoff)
router.patch(
  '/:id/transfer',
  authenticate,
  requireRole('admin', 'staff'),
  validate(transferSchema),
  transfer
);

// Admin + staff listing (both see all appointments)
router.get(
  '/',
  authenticate,
  requireRole('admin', 'staff'),
  validate(listAllAppointmentsQuery, 'query'),
  getAllAppointments
);

// Detail — admin sees any appointment; customer/staff only their own
// (ownership check lives in the controller, since it needs the row first).
router.get('/:id', authenticate, getAppointment);

export default router;
