import { query } from '@/config/db';
import { ApiError } from '@/utils/ApiError';

export interface DbService {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  gender: 'male' | 'female' | 'unisex';
  price_inr: string;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  max_concurrent_bookings: number | null;
  category_key: string;
  category_label: string;
}

// Splits a search box query into words and requires EVERY word to appear
// somewhere in the name, description, or category label (each word matched
// independently, so word order and which field it lands in don't matter —
// "wax legs" matches "Full Legs Wax (Honey)" just as well as "legs wax").
// A single-token query behaves exactly like the old plain substring search.
function addSearchClause(q: string | undefined, clauses: string[], params: unknown[]) {
  if (!q?.trim()) return;
  const words = q.trim().split(/\s+/).slice(0, 8); // cap to avoid pathological queries
  for (const word of words) {
    params.push(`%${word}%`);
    const p = `$${params.length}`;
    clauses.push(`(s.name ILIKE ${p} OR s.description ILIKE ${p} OR c.label ILIKE ${p})`);
  }
}

export async function listServices(filters: {
  categoryKey?: string;
  gender?: string;
  q?: string;
  activeOnly?: boolean;
}): Promise<DbService[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.activeOnly !== false) clauses.push(`s.is_active = TRUE`);

  if (filters.categoryKey) {
    params.push(filters.categoryKey);
    clauses.push(`c.key = $${params.length}`);
  }
  if (filters.gender) {
    params.push(filters.gender);
    clauses.push(`s.gender = $${params.length}`);
  }
  addSearchClause(filters.q, clauses, params);

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const { rows } = await query<DbService>(
    `SELECT s.*, c.key AS category_key, c.label AS category_label
     FROM services s
     JOIN service_categories c ON c.id = s.category_id
     ${where}
     ORDER BY s.name ASC`,
    params
  );
  return rows;
}

// Admin listing: sees archived services too (unlike the public list, which
// is always active-only), supports the same search, and is genuinely
// paginated server-side since the real catalog runs into the hundreds.
export async function listServicesAdmin(filters: {
  categoryKey?: string;
  gender?: string;
  q?: string;
  status?: 'active' | 'archived' | 'all';
  page: number;
  pageSize: number;
}): Promise<{ rows: DbService[]; total: number }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status === 'active') clauses.push(`s.is_active = TRUE`);
  else if (filters.status === 'archived') clauses.push(`s.is_active = FALSE`);
  // 'all' (or omitted) — no is_active clause at all.

  if (filters.categoryKey) {
    params.push(filters.categoryKey);
    clauses.push(`c.key = $${params.length}`);
  }
  if (filters.gender) {
    params.push(filters.gender);
    clauses.push(`s.gender = $${params.length}`);
  }
  addSearchClause(filters.q, clauses, params);

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*) FROM services s JOIN service_categories c ON c.id = s.category_id ${where}`,
    params
  );
  const total = Number(countRes.rows[0].count);

  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const { rows } = await query<DbService>(
    `SELECT s.*, c.key AS category_key, c.label AS category_label
     FROM services s
     JOIN service_categories c ON c.id = s.category_id
     ${where}
     ORDER BY c.display_order ASC, s.name ASC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...params, filters.pageSize, (filters.page - 1) * filters.pageSize]
  );
  return { rows, total };
}

export async function findServiceById(id: string): Promise<DbService | null> {
  const { rows } = await query<DbService>(
    `SELECT s.*, c.key AS category_key, c.label AS category_label
     FROM services s
     JOIN service_categories c ON c.id = s.category_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createService(input: {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  priceInr: number;
  durationMinutes: number;
  imageUrl?: string;
  maxConcurrentBookings?: number;
}): Promise<DbService> {
  const { rows } = await query<DbService>(
    `INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url, max_concurrent_bookings)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *,
       (SELECT key   FROM service_categories WHERE id = category_id) AS category_key,
       (SELECT label FROM service_categories WHERE id = category_id) AS category_label`,
    [
      input.categoryId,
      input.name,
      input.slug,
      input.description ?? null,
      input.gender,
      input.priceInr,
      input.durationMinutes,
      input.imageUrl ?? null,
      input.maxConcurrentBookings ?? null,
    ]
  );
  return rows[0];
}

export async function updateService(
  id: string,
  input: Partial<{
    name: string;
    description: string;
    gender: 'male' | 'female' | 'unisex';
    priceInr: number;
    durationMinutes: number;
    imageUrl: string;
    isActive: boolean;
    categoryId: string;
    maxConcurrentBookings: number | null;
  }>
): Promise<DbService | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };
  if (input.name !== undefined) push('name', input.name);
  if (input.description !== undefined) push('description', input.description);
  if (input.gender !== undefined) push('gender', input.gender);
  if (input.priceInr !== undefined) push('price_inr', input.priceInr);
  if (input.durationMinutes !== undefined) push('duration_minutes', input.durationMinutes);
  if (input.imageUrl !== undefined) push('image_url', input.imageUrl);
  if (input.isActive !== undefined) push('is_active', input.isActive);
  if (input.categoryId !== undefined) push('category_id', input.categoryId);
  if (input.maxConcurrentBookings !== undefined)
    push('max_concurrent_bookings', input.maxConcurrentBookings);
  if (!sets.length) return findServiceById(id);

  params.push(id);
  const { rows } = await query<DbService>(
    `UPDATE services SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING *,
       (SELECT key   FROM service_categories WHERE id = category_id) AS category_key,
       (SELECT label FROM service_categories WHERE id = category_id) AS category_label`,
    params
  );
  return rows[0] ?? null;
}

// Soft delete (is_active = false), not a hard DELETE — same reasoning as
// packages.deletePackage: a hard delete would either be blocked outright
// (appointment_services.service_id is ON DELETE RESTRICT once any booking
// has used it) or leave dangling references. Archiving keeps history valid
// and lets an admin reactivate it later from the same edit form.
// Unconditional on is_active so archiving an already-archived service is
// idempotent rather than a confusing 404.
export async function deleteService(id: string): Promise<boolean> {
  const { rowCount } = await query(`UPDATE services SET is_active = FALSE WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function listCategories() {
  const { rows } = await query(
    `SELECT id, key, label, display_order, is_active
     FROM service_categories
     WHERE is_active = TRUE
     ORDER BY display_order ASC, label ASC`
  );
  return rows;
}

// Admin management view — includes archived categories too (unlike the
// public listCategories above), same active/archived split convention as
// listServicesAdmin vs listServices.
export async function listCategoriesAdmin() {
  const { rows } = await query(
    `SELECT id, key, label, display_order, is_active
     FROM service_categories
     ORDER BY display_order ASC, label ASC`
  );
  return rows;
}

// `key` is permanent once created — it's not just a display label, it's
// load-bearing: the public Services page's gender tabs filter categories
// by `key.startsWith('male-'|'female-')`, and the gender-specific
// "sectioned" view (frontend/src/lib/serviceSections.ts) matches several
// of its catch-all rules directly against specific category keys (e.g.
// `inCategory('female-hair')`). Renaming a key after the fact would
// silently break both without any error. The gender prefix is baked into
// the key itself for the same reason — there's no separate gender column
// on this table.
export async function createCategory(input: {
  gender: 'male' | 'female';
  label: string;
  keySuffix: string;
  displayOrder?: number;
}) {
  const key = `${input.gender}-${input.keySuffix}`;
  try {
    const { rows } = await query(
      `INSERT INTO service_categories (key, label, display_order)
       VALUES ($1, $2, $3)
       RETURNING id, key, label, display_order, is_active`,
      [key, input.label, input.displayOrder ?? 0]
    );
    return rows[0];
  } catch (err: any) {
    if (err?.code === '23505') {
      throw ApiError.conflict(`A category with the key "${key}" already exists`);
    }
    throw err;
  }
}

// Label, display order, and active state only — never `key` (see
// createCategory's comment for why).
export async function updateCategory(
  id: string,
  input: Partial<{ label: string; displayOrder: number; isActive: boolean }>
) {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };
  if (input.label !== undefined) push('label', input.label);
  if (input.displayOrder !== undefined) push('display_order', input.displayOrder);
  if (input.isActive !== undefined) push('is_active', input.isActive);
  if (!sets.length) {
    const { rows } = await query(
      `SELECT id, key, label, display_order, is_active FROM service_categories WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  params.push(id);
  const { rows } = await query(
    `UPDATE service_categories SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING id, key, label, display_order, is_active`,
    params
  );
  return rows[0] ?? null;
}
