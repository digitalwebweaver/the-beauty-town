import { describe, expect, it } from 'vitest';
import { createAppointment, getAppointmentById } from '@/api/appointments/appointments.service';
import { query } from '@/config/db';
import {
  createCategory,
  createPackageRow,
  createService,
  createStaff,
  createCustomer,
} from './fixtures';

describe('appointments.service — double-booking guard', () => {
  it('rejects a second booking that overlaps an existing one for the same staff', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId, durationMinutes: 60 });
    const staffId = await createStaff();
    const customerId = await createCustomer();

    const first = await createAppointment({
      customerId,
      staffId,
      appointmentDate: '2030-01-15',
      startTime: '10:00',
      serviceIds: [service.id],
    });
    expect(first.status).toBe('pending');

    // Overlaps the first booking's 10:00–11:00 window.
    await expect(
      createAppointment({
        customerId: await createCustomer(),
        staffId,
        appointmentDate: '2030-01-15',
        startTime: '10:30',
        serviceIds: [service.id],
      })
    ).rejects.toThrow(/just booked/i);
  });

  it('allows a back-to-back booking that does not overlap', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId, durationMinutes: 30 });
    const staffId = await createStaff();

    await createAppointment({
      customerId: await createCustomer(),
      staffId,
      appointmentDate: '2030-01-16',
      startTime: '09:00',
      serviceIds: [service.id],
    });

    const second = await createAppointment({
      customerId: await createCustomer(),
      staffId,
      // Starts exactly when the first one ends — must not conflict.
      appointmentDate: '2030-01-16',
      startTime: '09:30',
      serviceIds: [service.id],
    });
    expect(second.status).toBe('pending');
  });
});

describe('appointments.service — package flat pricing', () => {
  it('charges the package price, not the summed service price, while keeping real service duration', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId, priceInr: 2499, durationMinutes: 75 });
    const pkg = await createPackageRow({ priceInr: 15000, serviceIds: [service.id] });
    const staffId = await createStaff();
    const customerId = await createCustomer();

    const appointment = await createAppointment({
      customerId,
      staffId,
      appointmentDate: '2030-02-01',
      startTime: '11:00',
      serviceIds: [service.id],
      packageId: pkg.id,
    });

    expect(Number(appointment.total_inr)).toBe(15000);
    expect(appointment.end_time).toBe('12:15:00'); // 75 min after 11:00, from the real service
    expect(appointment.services).toHaveLength(1);
    // appointment_services still snapshots the service's own real price —
    // only the appointment TOTAL reflects the package's flat bundle price.
    expect(Number(appointment.services[0].price)).toBe(2499);

    const reread = await getAppointmentById(appointment.id);
    expect(reread.package_id).toBe(pkg.id);
  });

  it('rejects booking through an inactive package', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId });
    const pkg = await createPackageRow({
      priceInr: 5000,
      serviceIds: [service.id],
      isActive: false,
    });

    await expect(
      createAppointment({
        customerId: await createCustomer(),
        staffId: await createStaff(),
        appointmentDate: '2030-02-02',
        startTime: '10:00',
        serviceIds: [service.id],
        packageId: pkg.id,
      })
    ).rejects.toThrow(/no longer offered/i);
  });
});

describe('appointments.service — auto-assign', () => {
  it('assigns a free staff member when staffId is null', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId });
    await createStaff(); // at least one free staff must exist

    const appointment = await createAppointment({
      customerId: await createCustomer(),
      staffId: null,
      appointmentDate: '2030-02-03',
      startTime: '14:00',
      serviceIds: [service.id],
    });
    expect(appointment.staff_id).toBeTruthy();
  });
});

// Sanity check that the fixtures/migrations wiring itself is correct —
// if this fails, every other test's failure is probably this, not the
// thing it claims to test.
describe('test harness sanity', () => {
  it('can read back a row it just wrote', async () => {
    const categoryId = await createCategory('sanity-check', 'Sanity Check');
    const { rows } = await query('SELECT label FROM service_categories WHERE id = $1', [
      categoryId,
    ]);
    expect(rows[0].label).toBe('Sanity Check');
  });
});
