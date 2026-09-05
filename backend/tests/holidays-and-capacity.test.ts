import { describe, expect, it } from 'vitest';
import { createAppointment } from '@/api/appointments/appointments.service';
import {
  createCategory,
  createHoliday,
  createService,
  createStaff,
  createCustomer,
  setServiceCapacity,
  setStaffAvailability,
} from './fixtures';

describe('appointments.service — salon holidays', () => {
  it('rejects a booking on a date the salon is closed', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId });
    await createHoliday('2030-04-10', 'Diwali');

    await expect(
      createAppointment({
        customerId: await createCustomer(),
        staffId: await createStaff(),
        appointmentDate: '2030-04-10',
        startTime: '10:00',
        serviceIds: [service.id],
      })
    ).rejects.toThrow(/closed/i);
  });
});

describe('appointments.service — per-service capacity cap', () => {
  it('rejects a booking once a service is at its concurrent-booking cap', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId, durationMinutes: 60 });
    await setServiceCapacity(service.id, 1);

    await createAppointment({
      customerId: await createCustomer(),
      staffId: await createStaff(), // different staff — isolates the capacity
      appointmentDate: '2030-04-11', //   check from the per-staff overlap guard
      startTime: '10:00',
      serviceIds: [service.id],
    });

    await expect(
      createAppointment({
        customerId: await createCustomer(),
        staffId: await createStaff(),
        appointmentDate: '2030-04-11',
        startTime: '10:30', // overlaps the first booking's 10:00–11:00 window
        serviceIds: [service.id],
      })
    ).rejects.toThrow(/fully booked/i);
  });

  it('still allows an overlapping booking for a different, uncapped service', async () => {
    const categoryId = await createCategory();
    const cappedService = await createService({ categoryId, durationMinutes: 60 });
    await setServiceCapacity(cappedService.id, 1);
    const otherService = await createService({ categoryId, durationMinutes: 60 });

    await createAppointment({
      customerId: await createCustomer(),
      staffId: await createStaff(),
      appointmentDate: '2030-04-12',
      startTime: '10:00',
      serviceIds: [cappedService.id],
    });

    const second = await createAppointment({
      customerId: await createCustomer(),
      staffId: await createStaff(),
      appointmentDate: '2030-04-12',
      startTime: '10:30',
      serviceIds: [otherService.id],
    });
    expect(second.status).toBe('pending');
  });
});

describe('appointments.service — staff working-hours enforcement', () => {
  it('rejects a booking outside a staff member’s configured hours', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId, durationMinutes: 30 });
    const staffId = await createStaff();
    // 2030-04-15 is a Monday (day_of_week = 1).
    await setStaffAvailability(staffId, 1, { startTime: '09:00', endTime: '12:00' });

    await expect(
      createAppointment({
        customerId: await createCustomer(),
        staffId,
        appointmentDate: '2030-04-15',
        startTime: '14:00',
        serviceIds: [service.id],
      })
    ).rejects.toThrow(/isn't available/i);
  });

  it('still books normally for a staff member with no configured availability row', async () => {
    const categoryId = await createCategory();
    const service = await createService({ categoryId, durationMinutes: 30 });
    const staffId = await createStaff(); // never touched staff_availability

    const appointment = await createAppointment({
      customerId: await createCustomer(),
      staffId,
      appointmentDate: '2030-04-16',
      startTime: '14:00',
      serviceIds: [service.id],
    });
    expect(appointment.status).toBe('pending');
  });
});
