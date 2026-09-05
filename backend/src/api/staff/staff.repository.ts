import { query, withTransaction } from '@/config/db';
import { ApiError } from '@/utils/ApiError';
import { hashPassword } from '@/utils/password';

export interface DbStaff {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role_title: string;
  bio: string | null;
  rating: string;
  experience_years: number;
  is_active: boolean;
  specialties: string[];
}

// ------ Read ------

export async function listStaff(opts?: { includeInactive?: boolean }): Promise<DbStaff[]> {
  const where = opts?.includeInactive ? '' : 'WHERE sp.is_active = TRUE';
  const { rows } = await query<DbStaff>(
    `SELECT sp.user_id,
            u.name,
            u.email,
            u.phone,
            u.avatar_url,
            sp.role_title,
            sp.bio,
            sp.rating,
            sp.experience_years,
            sp.is_active,
            COALESCE(
              (SELECT array_agg(c.key ORDER BY c.display_order)
               FROM staff_specialties ss
               JOIN service_categories c ON c.id = ss.category_id
               WHERE ss.staff_user_id = sp.user_id),
              ARRAY[]::text[]
            ) AS specialties
     FROM staff_profiles sp
     JOIN users u ON u.id = sp.user_id
     ${where}
     ORDER BY sp.is_active DESC, sp.rating DESC, u.name ASC`
  );
  return rows;
}

export async function findStaffById(userId: string): Promise<DbStaff | null> {
  const { rows } = await query<DbStaff>(
    `SELECT sp.user_id, u.name, u.email, u.phone, u.avatar_url,
            sp.role_title, sp.bio, sp.rating, sp.experience_years, sp.is_active,
            COALESCE(
              (SELECT array_agg(c.key ORDER BY c.display_order)
               FROM staff_specialties ss
               JOIN service_categories c ON c.id = ss.category_id
               WHERE ss.staff_user_id = sp.user_id),
              ARRAY[]::text[]
            ) AS specialties
     FROM staff_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

// ------ Create ------

export interface CreateStaffInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  roleTitle: string;
  bio?: string;
  experienceYears?: number;
  specialties: string[]; // category keys ['hair', 'skin']
  avatarUrl?: string;
}

export async function createStaff(input: CreateStaffInput): Promise<DbStaff> {
  const passwordHash = await hashPassword(input.password);

  const userId = await withTransaction(async (client) => {
    // 1. Create user
    let userRes;
    try {
      userRes = await client.query<{ id: string }>(
        `INSERT INTO users (name, email, phone, role, password_hash, avatar_url, email_verified)
         VALUES ($1, $2, $3, 'staff', $4, $5, TRUE)
         RETURNING id`,
        [input.name, input.email, input.phone ?? null, passwordHash, input.avatarUrl ?? null]
      );
    } catch (err: any) {
      if (err?.code === '23505') {
        throw ApiError.conflict('That email is already registered');
      }
      throw err;
    }
    const uid = userRes.rows[0].id;

    // 2. Create staff profile
    await client.query(
      `INSERT INTO staff_profiles (user_id, role_title, bio, experience_years)
       VALUES ($1, $2, $3, $4)`,
      [uid, input.roleTitle, input.bio ?? null, input.experienceYears ?? 0]
    );

    // 3. Specialties
    if (input.specialties?.length) {
      await client.query(
        `INSERT INTO staff_specialties (staff_user_id, category_id)
         SELECT $1, id FROM service_categories WHERE key = ANY($2::text[])
         ON CONFLICT DO NOTHING`,
        [uid, input.specialties]
      );
    }

    return uid;
  });

  const result = await findStaffById(userId);
  if (!result) throw ApiError.internal('Staff created but not readable');
  return result;
}

// ------ Update ------

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  roleTitle?: string;
  bio?: string;
  experienceYears?: number;
  rating?: number;
  isActive?: boolean;
  specialties?: string[];
}

export async function updateStaff(userId: string, input: UpdateStaffInput): Promise<DbStaff> {
  await withTransaction(async (client) => {
    // Update users table (name/phone/avatar)
    const userSets: string[] = [];
    const userParams: unknown[] = [];
    const uPush = (col: string, val: unknown) => {
      userParams.push(val);
      userSets.push(`${col} = $${userParams.length}`);
    };
    if (input.name !== undefined) uPush('name', input.name);
    if (input.phone !== undefined) uPush('phone', input.phone);
    if (input.avatarUrl !== undefined) uPush('avatar_url', input.avatarUrl);
    if (input.isActive !== undefined) uPush('is_active', input.isActive);

    if (userSets.length) {
      userParams.push(userId);
      const userRes = await client.query(
        `UPDATE users SET ${userSets.join(', ')} WHERE id = $${userParams.length} RETURNING id`,
        userParams
      );
      if (!userRes.rowCount) throw ApiError.notFound('Staff not found');
    }

    // Update staff_profiles
    const profSets: string[] = [];
    const profParams: unknown[] = [];
    const pPush = (col: string, val: unknown) => {
      profParams.push(val);
      profSets.push(`${col} = $${profParams.length}`);
    };
    if (input.roleTitle !== undefined) pPush('role_title', input.roleTitle);
    if (input.bio !== undefined) pPush('bio', input.bio);
    if (input.experienceYears !== undefined) pPush('experience_years', input.experienceYears);
    if (input.rating !== undefined) pPush('rating', input.rating);
    if (input.isActive !== undefined) pPush('is_active', input.isActive);

    if (profSets.length) {
      profParams.push(userId);
      await client.query(
        `UPDATE staff_profiles SET ${profSets.join(', ')} WHERE user_id = $${profParams.length}`,
        profParams
      );
    }

    // Replace specialties if provided
    if (input.specialties) {
      await client.query(`DELETE FROM staff_specialties WHERE staff_user_id = $1`, [userId]);
      if (input.specialties.length) {
        await client.query(
          `INSERT INTO staff_specialties (staff_user_id, category_id)
           SELECT $1, id FROM service_categories WHERE key = ANY($2::text[])
           ON CONFLICT DO NOTHING`,
          [userId, input.specialties]
        );
      }
    }
  });

  const result = await findStaffById(userId);
  if (!result) throw ApiError.notFound('Staff not found');
  return result;
}

// ------ Delete (soft) ------

export async function deactivateStaff(userId: string): Promise<void> {
  const { rowCount } = await query(
    `UPDATE staff_profiles SET is_active = FALSE WHERE user_id = $1`,
    [userId]
  );
  if (!rowCount) throw ApiError.notFound('Staff not found');
  await query(`UPDATE users SET is_active = FALSE WHERE id = $1`, [userId]);
}

// ------ Weekly availability ------

interface AvailabilityDayInput {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

// One upsert per day (7 rows max) — small enough that a loop inside a
// transaction is simpler than a bulk statement, and this only runs when
// a staff member actually saves their schedule.
export async function saveAvailability(
  staffUserId: string,
  days: AvailabilityDayInput[]
): Promise<void> {
  await withTransaction(async (client) => {
    for (const d of days) {
      await client.query(
        `INSERT INTO staff_availability (staff_user_id, day_of_week, start_time, end_time, is_available)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (staff_user_id, day_of_week)
         DO UPDATE SET start_time = $3, end_time = $4, is_available = $5`,
        [staffUserId, d.dayOfWeek, d.startTime, d.endTime, d.isAvailable]
      );
    }
  });
}
