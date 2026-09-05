// Minimal, realistic fixture builders for the integration tests — inserts
// directly via the app's own `query()` helper (same as the app itself
// uses), not a separate ORM/factory library. Each builder generates a
// unique-enough name/slug/email per call (via `rand()`) so tests can run
// repeatedly against the same test database without UNIQUE-constraint
// collisions, without needing per-test cleanup.
import crypto from 'crypto';
import { query } from '@/config/db';

export function rand(): string {
  return crypto.randomBytes(4).toString('hex');
}

export async function createCategory(key = 'hair', label = 'Hair'): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO service_categories (key, label)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label
     RETURNING id`,
    [key, label]
  );
  return rows[0].id;
}

export async function createService(opts: {
  categoryId: string;
  priceInr?: number;
  durationMinutes?: number;
  name?: string;
}): Promise<{ id: string; priceInr: number; durationMinutes: number }> {
  const name = opts.name ?? `Test Service ${rand()}`;
  const priceInr = opts.priceInr ?? 1000;
  const durationMinutes = opts.durationMinutes ?? 30;
  const { rows } = await query<{ id: string }>(
    `INSERT INTO services (category_id, name, slug, gender, price_inr, duration_minutes)
     VALUES ($1, $2, $3, 'unisex', $4, $5)
     RETURNING id`,
    [
      opts.categoryId,
      name,
      `${name.toLowerCase().replace(/\s+/g, '-')}-${rand()}`,
      priceInr,
      durationMinutes,
    ]
  );
  return { id: rows[0].id, priceInr, durationMinutes };
}

export async function createProduct(opts: {
  stock?: number;
  priceInr?: number;
  name?: string;
}): Promise<{ id: string; priceInr: number; stock: number }> {
  const name = opts.name ?? `Test Product ${rand()}`;
  const priceInr = opts.priceInr ?? 500;
  const stock = opts.stock ?? 10;
  const { rows } = await query<{ id: string }>(
    `INSERT INTO products (name, category, stock, price_inr, reorder_level)
     VALUES ($1, 'misc', $2, $3, 2)
     RETURNING id`,
    [name, stock, priceInr]
  );
  return { id: rows[0].id, priceInr, stock };
}

export async function createPackageRow(opts: {
  priceInr: number;
  serviceIds?: string[];
  name?: string;
  isActive?: boolean;
}): Promise<{ id: string }> {
  const name = opts.name ?? `Test Package ${rand()}`;
  const { rows } = await query<{ id: string }>(
    `INSERT INTO packages (name, slug, category, gender, price_inr, is_active)
     VALUES ($1, $2, 'Test Category', 'unisex', $3, $4)
     RETURNING id`,
    [
      name,
      `${name.toLowerCase().replace(/\s+/g, '-')}-${rand()}`,
      opts.priceInr,
      opts.isActive ?? true,
    ]
  );
  for (const serviceId of opts.serviceIds ?? []) {
    await query(`INSERT INTO package_services (package_id, service_id) VALUES ($1, $2)`, [
      rows[0].id,
      serviceId,
    ]);
  }
  return { id: rows[0].id };
}

export async function createCustomer(opts: { name?: string } = {}): Promise<string> {
  const suffix = rand();
  const { rows } = await query<{ id: string }>(
    `INSERT INTO users (name, email, phone, role, email_verified)
     VALUES ($1, $2, $3, 'customer', TRUE)
     RETURNING id`,
    [
      opts.name ?? `Test Customer ${suffix}`,
      `customer-${suffix}@test.local`,
      `9${suffix.slice(0, 9)}`,
    ]
  );
  return rows[0].id;
}

export async function createHoliday(date: string, reason?: string): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO salon_holidays (holiday_date, reason) VALUES ($1, $2) RETURNING id`,
    [date, reason ?? null]
  );
  return rows[0].id;
}

/**
 * Upsert one weekly-hours row for a staff member (day_of_week: 0=Sunday
 * ... 6=Saturday, matching Postgres's EXTRACT(DOW)). Mirrors what
 * PUT /staff/availability does — a single row per staff+day.
 */
export async function setStaffAvailability(
  staffId: string,
  dayOfWeek: number,
  opts: { startTime?: string; endTime?: string; isAvailable?: boolean } = {}
): Promise<void> {
  await query(
    `INSERT INTO staff_availability (staff_user_id, day_of_week, start_time, end_time, is_available)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (staff_user_id, day_of_week) DO UPDATE
       SET start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           is_available = EXCLUDED.is_available`,
    [
      staffId,
      dayOfWeek,
      opts.startTime ?? '09:00',
      opts.endTime ?? '18:00',
      opts.isAvailable ?? true,
    ]
  );
}

export async function setServiceCapacity(serviceId: string, cap: number): Promise<void> {
  await query(`UPDATE services SET max_concurrent_bookings = $1 WHERE id = $2`, [cap, serviceId]);
}

export async function createStaff(opts: { name?: string } = {}): Promise<string> {
  const suffix = rand();
  // users_staff_admin_must_have_password requires a non-null password_hash
  // for any non-customer role — the actual hash never matters here since
  // these tests never log in as this user.
  const { rows } = await query<{ id: string }>(
    `INSERT INTO users (name, email, phone, role, password_hash, email_verified, is_active)
     VALUES ($1, $2, $3, 'staff', 'not-a-real-hash', TRUE, TRUE)
     RETURNING id`,
    [opts.name ?? `Test Staff ${suffix}`, `staff-${suffix}@test.local`, `9${suffix.slice(0, 9)}`]
  );
  await query(
    `INSERT INTO staff_profiles (user_id, role_title, is_active) VALUES ($1, 'Stylist', TRUE)`,
    [rows[0].id]
  );
  return rows[0].id;
}
