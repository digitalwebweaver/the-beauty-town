import type { PoolClient } from 'pg';
import { query, withTransaction } from '@/config/db';

export interface DbPackageService {
  id: string;
  name: string;
  priceInr: string;
  durationMinutes: number;
}

export interface DbPackage {
  id: string;
  name: string;
  slug: string;
  category: string;
  gender: 'male' | 'female' | 'unisex';
  description: string | null;
  price_inr: string;
  worth_inr: string | null;
  validity_label: string | null;
  inclusions: string[];
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  services: DbPackageService[];
  is_bookable: boolean;
}

const SELECT_BASE = `
  SELECT p.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id', s.id, 'name', s.name,
               'priceInr', s.price_inr, 'durationMinutes', s.duration_minutes
             )
           ) FILTER (WHERE s.id IS NOT NULL),
           '[]'
         ) AS services,
         COUNT(s.id) > 0 AS is_bookable
  FROM packages p
  LEFT JOIN package_services ps ON ps.package_id = p.id
  LEFT JOIN services s ON s.id = ps.service_id`;

export async function listPackages(filters: {
  category?: string;
  gender?: string;
  activeOnly?: boolean;
}): Promise<DbPackage[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.activeOnly !== false) clauses.push(`p.is_active = TRUE`);
  if (filters.category) {
    params.push(filters.category);
    clauses.push(`p.category = $${params.length}`);
  }
  if (filters.gender) {
    params.push(filters.gender);
    clauses.push(`p.gender = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const { rows } = await query<DbPackage>(
    `${SELECT_BASE}
     ${where}
     GROUP BY p.id
     ORDER BY p.category ASC, p.display_order ASC, p.name ASC`,
    params
  );
  return rows;
}

export async function findPackageById(
  id: string,
  opts: { activeOnly?: boolean } = {}
): Promise<DbPackage | null> {
  const clause = opts.activeOnly ? `WHERE p.id = $1 AND p.is_active = TRUE` : `WHERE p.id = $1`;
  const { rows } = await query<DbPackage>(
    `${SELECT_BASE}
     ${clause}
     GROUP BY p.id`,
    [id]
  );
  return rows[0] ?? null;
}

async function replacePackageServices(client: PoolClient, packageId: string, serviceIds: string[]) {
  await client.query(`DELETE FROM package_services WHERE package_id = $1`, [packageId]);
  if (!serviceIds.length) return;
  const values = serviceIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await client.query(`INSERT INTO package_services (package_id, service_id) VALUES ${values}`, [
    packageId,
    ...serviceIds,
  ]);
}

export async function createPackage(input: {
  name: string;
  slug: string;
  category: string;
  gender: 'male' | 'female' | 'unisex';
  description?: string;
  priceInr: number;
  worthInr?: number;
  validityLabel?: string;
  inclusions: string[];
  imageUrl?: string;
  serviceIds: string[];
  displayOrder?: number;
}): Promise<DbPackage> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO packages (
         name, slug, category, gender, description, price_inr, worth_inr,
         validity_label, inclusions, image_url, display_order
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        input.name,
        input.slug,
        input.category,
        input.gender,
        input.description ?? null,
        input.priceInr,
        input.worthInr ?? null,
        input.validityLabel ?? null,
        input.inclusions,
        input.imageUrl ?? null,
        input.displayOrder ?? 0,
      ]
    );
    const id = rows[0].id;
    await replacePackageServices(client, id, input.serviceIds);
    return (await findPackageByIdWith(client, id))!;
  });
}

export async function updatePackage(
  id: string,
  input: Partial<{
    name: string;
    category: string;
    gender: 'male' | 'female' | 'unisex';
    description: string;
    priceInr: number;
    worthInr: number;
    validityLabel: string;
    inclusions: string[];
    imageUrl: string;
    isActive: boolean;
    displayOrder: number;
    serviceIds: string[];
  }>
): Promise<DbPackage | null> {
  return withTransaction(async (client) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (col: string, val: unknown) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };
    if (input.name !== undefined) push('name', input.name);
    if (input.category !== undefined) push('category', input.category);
    if (input.gender !== undefined) push('gender', input.gender);
    if (input.description !== undefined) push('description', input.description);
    if (input.priceInr !== undefined) push('price_inr', input.priceInr);
    if (input.worthInr !== undefined) push('worth_inr', input.worthInr);
    if (input.validityLabel !== undefined) push('validity_label', input.validityLabel);
    if (input.inclusions !== undefined) push('inclusions', input.inclusions);
    if (input.imageUrl !== undefined) push('image_url', input.imageUrl);
    if (input.isActive !== undefined) push('is_active', input.isActive);
    if (input.displayOrder !== undefined) push('display_order', input.displayOrder);

    if (sets.length) {
      params.push(id);
      const { rowCount } = await client.query(
        `UPDATE packages SET ${sets.join(', ')} WHERE id = $${params.length}`,
        params
      );
      if (!rowCount) return null;
    } else {
      const exists = await client.query(`SELECT 1 FROM packages WHERE id = $1`, [id]);
      if (!exists.rowCount) return null;
    }

    if (input.serviceIds !== undefined) {
      await replacePackageServices(client, id, input.serviceIds);
    }

    return findPackageByIdWith(client, id);
  });
}

async function findPackageByIdWith(client: PoolClient, id: string): Promise<DbPackage | null> {
  const { rows } = await client.query<DbPackage>(
    `${SELECT_BASE}
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  );
  return rows[0] ?? null;
}

// Soft delete (is_active = false), not a hard DELETE. A hard delete would
// either be blocked outright (sale_items.package_id is ON DELETE RESTRICT
// once any sale has used it) or silently null out package_id on any
// appointment that referenced it (ON DELETE SET NULL) — losing that link
// with no warning. Archiving instead keeps every existing reference valid
// and lets an admin reactivate it later from the same edit form.
export async function deletePackage(id: string): Promise<boolean> {
  // Unconditional on is_active (not "... AND is_active = TRUE") so
  // archiving an already-archived package is idempotent — a 404 there
  // would be a confusing surprise, not a meaningful "not found".
  const { rowCount } = await query(`UPDATE packages SET is_active = FALSE WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}
