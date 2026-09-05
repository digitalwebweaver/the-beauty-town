import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '@/config/db';
import { ApiError } from '@/utils/ApiError';
import { isHoliday } from '@/api/holidays/holidays.repository';

/**
 * Add HH:MM + minutes → HH:MM:SS string (for DB).
 */
function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:00`;
}

/**
 * Reject a booking that falls outside a staff member's configured weekly
 * hours (staff_availability). A staff member with NO configured row for
 * that day is treated as available — this is the safe default, preserving
 * today's actual behavior for anyone who's never touched the availability
 * settings, so turning on enforcement doesn't retroactively lock them out.
 */
async function assertStaffAvailable(
  client: PoolClient,
  staffId: string,
  date: string,
  startTimeHms: string,
  endTimeHms: string
) {
  const { rows } = await client.query<{ unavailable: boolean }>(
    `SELECT (NOT is_available OR start_time > $3::time OR end_time < $4::time) AS unavailable
     FROM staff_availability
     WHERE staff_user_id = $1 AND day_of_week = EXTRACT(DOW FROM $2::date)`,
    [staffId, date, startTimeHms, endTimeHms]
  );
  if (rows.length && rows[0].unavailable) {
    throw ApiError.badRequest("This stylist isn't available at that time");
  }
}

interface CreateInput {
  customerId: string;
  staffId: string | null;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  serviceIds: string[];
  packageId?: string;
  notes?: string;
}

/**
 * Resolve a customerId for a guest booking, without ever creating a
 * duplicate account for a repeat visitor. Prefers a real email match
 * (unique, authoritative); falls back to phone (the salon's canonical
 * contact channel everywhere else — walk-ins, POS, etc). Only inserts a
 * fresh row when neither matches, using the same synthetic-placeholder-email
 * pattern as the admin walk-in flow (`users.routes.ts`) when no email was given.
 */
export async function findOrCreateGuestCustomer(input: {
  name: string;
  phone: string;
  email?: string;
}): Promise<string> {
  if (input.email) {
    const byEmail = await query<{ id: string }>(
      `SELECT id FROM users WHERE email_lower = LOWER($1) AND role = 'customer' LIMIT 1`,
      [input.email]
    );
    if (byEmail.rowCount) return byEmail.rows[0].id;
  }

  // `input.phone` is always a bare 10-digit string (validated by phoneField()
  // before this runs). A stored phone might carry a country code / spaces /
  // punctuation from elsewhere (older data, manual entry) — compare on just
  // the last 10 digits so formatting differences never cause a false miss
  // and a silently-duplicated customer.
  const byPhone = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE right(regexp_replace(phone, '\\D', '', 'g'), 10) = $1
       AND role = 'customer' LIMIT 1`,
    [input.phone]
  );
  if (byPhone.rowCount) return byPhone.rows[0].id;

  const email =
    input.email ??
    `guest_${Date.now()}_${crypto.randomBytes(3).toString('hex')}@internal.thebeautytown`;

  try {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO users (name, email, phone, role, email_verified)
       VALUES ($1, $2, $3, 'customer', $4)
       RETURNING id`,
      [input.name, email, input.phone, !!input.email]
    );
    return rows[0].id;
  } catch (err: any) {
    if (err?.code === '23505') {
      // Race: someone else registered this exact email between our lookup and insert.
      const retry = await query<{ id: string }>(
        `SELECT id FROM users WHERE email_lower = LOWER($1) LIMIT 1`,
        [email]
      );
      if (retry.rowCount) return retry.rows[0].id;
    }
    throw err;
  }
}

export async function createAppointment(input: CreateInput) {
  // Holiday check — first thing, before touching any locks. Checked
  // outside the transaction since it's read-only and never changes based
  // on anything this transaction does.
  if (await isHoliday(input.appointmentDate)) {
    throw ApiError.badRequest('The salon is closed on this date');
  }

  return withTransaction(async (client) => {
    // 1. Lock service rows & compute total price + total duration
    const svcRes = await client.query<{
      id: string;
      name: string;
      price_inr: string;
      duration_minutes: number;
      is_active: boolean;
      max_concurrent_bookings: number | null;
    }>(
      `SELECT id, name, price_inr, duration_minutes, is_active, max_concurrent_bookings
       FROM services
       WHERE id = ANY($1::uuid[])
       FOR SHARE`,
      [input.serviceIds]
    );

    if (svcRes.rows.length !== input.serviceIds.length) {
      throw ApiError.badRequest('One or more services not found');
    }
    if (svcRes.rows.some((s) => !s.is_active)) {
      throw ApiError.badRequest('One or more services are inactive');
    }

    const totalDuration = svcRes.rows.reduce((sum, s) => sum + s.duration_minutes, 0);
    let totalPrice = svcRes.rows.reduce((sum, s) => sum + Number(s.price_inr), 0);
    const endTime = addMinutes(input.startTime, totalDuration);

    // 1b. Per-service capacity check — for every service with a
    // max_concurrent_bookings cap, lock and count overlapping active
    // bookings that include it. `FOR UPDATE OF a` means two simultaneous
    // bookings against a near-capacity service can't both slip through:
    // the second blocks on the lock until the first commits, then
    // re-counts correctly.
    for (const s of svcRes.rows) {
      if (s.max_concurrent_bookings == null) continue;
      const capRes = await client.query(
        `SELECT a.id
         FROM appointments a
         JOIN appointment_services asx ON asx.appointment_id = a.id
         WHERE asx.service_id = $1
           AND a.status NOT IN ('cancelled', 'no_show')
           AND tsrange(
             (a.appointment_date + a.start_time)::timestamp,
             (a.appointment_date + a.end_time)::timestamp
           ) && tsrange(
             ($2::date + $3::time)::timestamp,
             ($2::date + $4::time)::timestamp
           )
         FOR UPDATE OF a`,
        [s.id, input.appointmentDate, input.startTime + ':00', endTime]
      );
      if ((capRes.rowCount ?? 0) >= s.max_concurrent_bookings) {
        throw ApiError.conflict(`${s.name} is fully booked for that time`);
      }
    }

    // If this booking was made through a package, charge the package's own
    // flat (discounted-bundle) price instead of the summed service prices —
    // appointment_services below still snapshots each real service's own
    // price for historical/reporting accuracy, only the appointment TOTAL
    // reflects the bundle price, same idea as a coupon discount.
    let packageId: string | null = null;
    if (input.packageId) {
      const pkgRes = await client.query<{ id: string; price_inr: string; is_active: boolean }>(
        `SELECT id, price_inr, is_active FROM packages WHERE id = $1 FOR SHARE`,
        [input.packageId]
      );
      if (!pkgRes.rowCount) throw ApiError.badRequest('Package not found');
      if (!pkgRes.rows[0].is_active) throw ApiError.badRequest('That package is no longer offered');
      packageId = pkgRes.rows[0].id;
      totalPrice = Number(pkgRes.rows[0].price_inr);
    }

    // 2. If a specific staff was requested, verify they exist and are staff.
    //    If null, we auto-pick a free staff (simple round-robin by availability).
    let staffId = input.staffId;

    if (staffId) {
      const check = await client.query(
        `SELECT 1 FROM users WHERE id = $1 AND role = 'staff' AND is_active = TRUE`,
        [staffId]
      );
      if (!check.rowCount) throw ApiError.badRequest('Staff not found');
      await assertStaffAvailable(
        client,
        staffId,
        input.appointmentDate,
        input.startTime + ':00',
        endTime
      );
    } else {
      // Auto-assign: find a staff with no overlapping active appointment
      // who's also actually configured to work this day/time (or hasn't
      // configured anything — no row means available, same safe default
      // as assertStaffAvailable above).
      const auto = await client.query<{ id: string }>(
        `SELECT u.id
         FROM users u
         WHERE u.role = 'staff' AND u.is_active = TRUE
           AND NOT EXISTS (
             SELECT 1 FROM appointments a
             WHERE a.staff_id = u.id
               AND a.status NOT IN ('cancelled', 'no_show')
               AND tsrange(
                 (a.appointment_date + a.start_time)::timestamp,
                 (a.appointment_date + a.end_time)::timestamp
               ) && tsrange(
                 ($1::date + $2::time)::timestamp,
                 ($1::date + $3::time)::timestamp
               )
           )
           AND NOT EXISTS (
             SELECT 1 FROM staff_availability sa
             WHERE sa.staff_user_id = u.id
               AND sa.day_of_week = EXTRACT(DOW FROM $1::date)
               AND (NOT sa.is_available OR sa.start_time > $2::time OR sa.end_time < $3::time)
           )
         ORDER BY random()
         LIMIT 1`,
        [input.appointmentDate, input.startTime + ':00', endTime]
      );
      if (!auto.rowCount) throw ApiError.conflict('No staff available for that slot');
      staffId = auto.rows[0].id;
    }

    // 3. Insert appointment.
    //    The `no_double_booking` EXCLUSION constraint on the table will
    //    reject any overlap for the same active staff — this is the
    //    hard guarantee against double-booking.
    try {
      const ap = await client.query<{ id: string }>(
        `INSERT INTO appointments (
           customer_id, staff_id, appointment_date, start_time, end_time,
           status, total_inr, notes, package_id
         )
         VALUES ($1, $2, $3, $4::time, $5::time, 'pending', $6, $7, $8)
         RETURNING id`,
        [
          input.customerId,
          staffId,
          input.appointmentDate,
          input.startTime + ':00',
          endTime,
          totalPrice,
          input.notes ?? null,
          packageId,
        ]
      );

      const appointmentId = ap.rows[0].id;

      // 4. Insert booking-line items with snapshot prices
      for (const s of svcRes.rows) {
        await client.query(
          `INSERT INTO appointment_services
             (appointment_id, service_id, price_at_booking, duration_at_booking)
           VALUES ($1, $2, $3, $4)`,
          [appointmentId, s.id, s.price_inr, s.duration_minutes]
        );
      }

      return await getAppointmentById(appointmentId, client);
    } catch (err: any) {
      if (err?.code === '23P01') {
        // exclusion constraint violation
        throw ApiError.conflict('That slot was just booked. Try a different time.');
      }
      throw err;
    }
  });
}

export async function getAppointmentById(id: string, client?: any) {
  const runner = client ?? { query };
  const { rows } = await runner.query(
    `SELECT a.id,
            a.customer_id, cu.name AS customer_name, cu.phone AS customer_phone,
            a.staff_id, st.name AS staff_name,
            a.appointment_date, a.start_time, a.end_time,
            a.status, a.total_inr, a.notes,
            a.package_id, pk.name AS package_name,
            a.created_at,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'id', s.id,
                 'name', s.name,
                 'price', asx.price_at_booking,
                 'durationMinutes', asx.duration_at_booking
               ))
               FROM appointment_services asx
               JOIN services s ON s.id = asx.service_id
               WHERE asx.appointment_id = a.id),
              '[]'::json
            ) AS services
     FROM appointments a
     JOIN users cu ON cu.id = a.customer_id
     LEFT JOIN users st ON st.id = a.staff_id
     LEFT JOIN packages pk ON pk.id = a.package_id
     WHERE a.id = $1`,
    [id]
  );
  return rows[0];
}

export async function listMyAppointments(customerId: string) {
  const { rows } = await query(
    `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.total_inr, a.notes,
            st.id AS staff_id, st.name AS staff_name,
            COALESCE(
              (SELECT json_agg(s.name)
               FROM appointment_services asx
               JOIN services s ON s.id = asx.service_id
               WHERE asx.appointment_id = a.id),
              '[]'::json
            ) AS service_names
     FROM appointments a
     LEFT JOIN users st ON st.id = a.staff_id
     WHERE a.customer_id = $1
     ORDER BY a.appointment_date DESC, a.start_time DESC
     LIMIT 200`,
    [customerId]
  );
  return rows;
}

export async function listStaffAppointments(staffId: string) {
  const { rows } = await query(
    `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.total_inr,
            cu.name AS customer_name, cu.phone AS customer_phone,
            COALESCE(
              (SELECT json_agg(s.name)
               FROM appointment_services asx
               JOIN services s ON s.id = asx.service_id
               WHERE asx.appointment_id = a.id),
              '[]'::json
            ) AS service_names
     FROM appointments a
     JOIN users cu ON cu.id = a.customer_id
     WHERE a.staff_id = $1
     ORDER BY a.appointment_date DESC, a.start_time DESC
     LIMIT 200`,
    [staffId]
  );
  return rows;
}

export async function listAllAppointments(filters: {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  staffId?: string;
}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    where.push(`a.status = $${params.length}`);
  }
  if (filters.staffId) {
    params.push(filters.staffId);
    where.push(`a.staff_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`a.appointment_date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`a.appointment_date <= $${params.length}`);
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(cu.name ILIKE $${params.length} OR st.name ILIKE $${params.length})`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.total_inr,
            cu.name AS customer_name, cu.phone AS customer_phone,
            st.name AS staff_name,
            COALESCE(
              (SELECT json_agg(s.name)
               FROM appointment_services asx
               JOIN services s ON s.id = asx.service_id
               WHERE asx.appointment_id = a.id),
              '[]'::json
            ) AS service_names
     FROM appointments a
     JOIN users cu ON cu.id = a.customer_id
     LEFT JOIN users st ON st.id = a.staff_id
     ${clause}
     ORDER BY a.appointment_date DESC, a.start_time DESC
     LIMIT 500`,
    params
  );
  return rows;
}

export async function transferAppointment(id: string, newStaffId: string) {
  // Verify new staff is real & active
  const staffOk = await query(
    `SELECT 1 FROM users u
     JOIN staff_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1 AND u.role = 'staff' AND u.is_active AND sp.is_active`,
    [newStaffId]
  );
  if (!staffOk.rowCount) throw ApiError.badRequest('New staff not found or inactive');

  try {
    const { rowCount } = await query(`UPDATE appointments SET staff_id = $1 WHERE id = $2`, [
      newStaffId,
      id,
    ]);
    if (!rowCount) throw ApiError.notFound('Appointment not found');
  } catch (err: any) {
    if (err?.code === '23P01') {
      throw ApiError.conflict('New staff is already booked during that time window');
    }
    throw err;
  }
  return getAppointmentById(id);
}

export async function updateAppointmentStatus(id: string, status: string) {
  const { rows, rowCount } = await query(
    `UPDATE appointments
     SET status = $2::appointment_status,
         cancelled_at = CASE WHEN $2 = 'cancelled' THEN NOW() ELSE cancelled_at END,
         completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END
     WHERE id = $1
     RETURNING id`,
    [id, status]
  );
  if (!rowCount) throw ApiError.notFound('Appointment not found');
  return getAppointmentById(rows[0].id);
}

export async function cancelAppointment(id: string, customerId: string, reason?: string) {
  const { rowCount } = await query(
    `UPDATE appointments
     SET status = 'cancelled',
         cancelled_at = NOW(),
         cancellation_reason = $3
     WHERE id = $1 AND customer_id = $2
       AND status IN ('pending', 'confirmed')`,
    [id, customerId, reason ?? null]
  );
  if (!rowCount) throw ApiError.badRequest('Cannot cancel — not found or already started');
  return getAppointmentById(id);
}

// Salon's booking window — must match the frontend's TIME_SLOTS list
// (BookAppointmentPage.tsx). Previously hardcoded to 18:30 here while the
// frontend offered a 19:00 slot that could never be reported busy.
const SLOT_WINDOW_START = '09:00';
const SLOT_WINDOW_END = '19:00';

/**
 * Return HH:MM slots that CANNOT be booked for a service of `durationMinutes`
 * starting at that time — the client greys these out.
 *
 * - Holiday: the whole day is closed, every slot comes back busy.
 * - If `staffId` is provided: slot is busy when THAT staff has an overlap,
 *   or when the staff's configured weekly hours don't cover the slot (no
 *   configured row = treated as available, same default as booking).
 * - If `staffId` is omitted (any stylist): slot is busy only when EVERY
 *   active, available staff has an overlap for the requested duration
 *   (i.e. nobody free).
 * - `serviceIds` (optional): a slot is also busy when any of these
 *   services has hit its `max_concurrent_bookings` cap for that window,
 *   regardless of staff availability.
 */
export async function busySlots(params: {
  staffId?: string;
  date: string;
  durationMinutes: number;
  serviceIds?: string[];
}) {
  const { staffId, date, durationMinutes, serviceIds = [] } = params;

  if (await isHoliday(date)) {
    const { rows } = await query<{ slot: string }>(
      `SELECT to_char(gs.slot_ts, 'HH24:MI') AS slot
       FROM generate_series(
         ($1::date + $2::time)::timestamp,
         ($1::date + $3::time)::timestamp,
         interval '30 minutes'
       ) AS gs(slot_ts)`,
      [date, SLOT_WINDOW_START, SLOT_WINDOW_END]
    );
    return { staffId: staffId ?? null, date, busy: rows.map((r) => r.slot) };
  }

  if (staffId) {
    const { rows } = await query<{ slot: string }>(
      `SELECT to_char(gs.slot_ts, 'HH24:MI') AS slot
       FROM generate_series(
         ($2::date + $5::time)::timestamp,
         ($2::date + $6::time)::timestamp,
         interval '30 minutes'
       ) AS gs(slot_ts)
       WHERE EXISTS (
         SELECT 1 FROM appointments a
         WHERE a.staff_id = $1
           AND a.appointment_date = $2::date
           AND a.status NOT IN ('cancelled', 'no_show')
           AND tsrange(
             (a.appointment_date + a.start_time)::timestamp,
             (a.appointment_date + a.end_time)::timestamp
           ) && tsrange(
             gs.slot_ts,
             gs.slot_ts + make_interval(mins => $3::int)
           )
       )
       OR EXISTS (
         SELECT 1 FROM staff_availability sa
         WHERE sa.staff_user_id = $1
           AND sa.day_of_week = EXTRACT(DOW FROM $2::date)
           AND (
             NOT sa.is_available
             OR sa.start_time > gs.slot_ts::time
             OR sa.end_time < (gs.slot_ts + make_interval(mins => $3::int))::time
           )
       )
       OR EXISTS (
         SELECT 1 FROM UNNEST($4::uuid[]) AS sid(id)
         JOIN services sv ON sv.id = sid.id AND sv.max_concurrent_bookings IS NOT NULL
         WHERE (
           SELECT COUNT(*) FROM appointments a2
           JOIN appointment_services asx ON asx.appointment_id = a2.id
           WHERE asx.service_id = sv.id
             AND a2.status NOT IN ('cancelled', 'no_show')
             AND tsrange(
               (a2.appointment_date + a2.start_time)::timestamp,
               (a2.appointment_date + a2.end_time)::timestamp
             ) && tsrange(gs.slot_ts, gs.slot_ts + make_interval(mins => $3::int))
         ) >= sv.max_concurrent_bookings
       )
       ORDER BY gs.slot_ts`,
      [staffId, date, durationMinutes, serviceIds, SLOT_WINDOW_START, SLOT_WINDOW_END]
    );
    return { staffId, date, busy: rows.map((r) => r.slot) };
  }

  // Any stylist: a slot is busy only when NO active, available staff is
  // free for the full window (or when a capacity-capped service is full).
  const { rows } = await query<{ slot: string }>(
    `SELECT to_char(gs.slot_ts, 'HH24:MI') AS slot
     FROM generate_series(
       ($1::date + $4::time)::timestamp,
       ($1::date + $5::time)::timestamp,
       interval '30 minutes'
     ) AS gs(slot_ts)
     WHERE NOT EXISTS (
       SELECT 1
       FROM users u
       JOIN staff_profiles sp ON sp.user_id = u.id
       WHERE u.role = 'staff' AND u.is_active AND sp.is_active
         AND NOT EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.staff_id = u.id
             AND a.appointment_date = $1::date
             AND a.status NOT IN ('cancelled', 'no_show')
             AND tsrange(
               (a.appointment_date + a.start_time)::timestamp,
               (a.appointment_date + a.end_time)::timestamp
             ) && tsrange(
               gs.slot_ts,
               gs.slot_ts + make_interval(mins => $2::int)
             )
         )
         AND NOT EXISTS (
           SELECT 1 FROM staff_availability sa
           WHERE sa.staff_user_id = u.id
             AND sa.day_of_week = EXTRACT(DOW FROM $1::date)
             AND (
               NOT sa.is_available
               OR sa.start_time > gs.slot_ts::time
               OR sa.end_time < (gs.slot_ts + make_interval(mins => $2::int))::time
             )
         )
     )
     OR EXISTS (
       SELECT 1 FROM UNNEST($3::uuid[]) AS sid(id)
       JOIN services sv ON sv.id = sid.id AND sv.max_concurrent_bookings IS NOT NULL
       WHERE (
         SELECT COUNT(*) FROM appointments a2
         JOIN appointment_services asx ON asx.appointment_id = a2.id
         WHERE asx.service_id = sv.id
           AND a2.status NOT IN ('cancelled', 'no_show')
           AND tsrange(
             (a2.appointment_date + a2.start_time)::timestamp,
             (a2.appointment_date + a2.end_time)::timestamp
           ) && tsrange(gs.slot_ts, gs.slot_ts + make_interval(mins => $2::int))
       ) >= sv.max_concurrent_bookings
     )
     ORDER BY gs.slot_ts`,
    [date, durationMinutes, serviceIds, SLOT_WINDOW_START, SLOT_WINDOW_END]
  );
  return { staffId: null, date, busy: rows.map((r) => r.slot) };
}
