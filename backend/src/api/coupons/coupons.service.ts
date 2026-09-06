import type { PoolClient } from 'pg';
import { query, withTransaction } from '@/config/db';
import { ApiError } from '@/utils/ApiError';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface CouponItemInput {
  type: 'service' | 'product';
  id: string;
}

interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  maxDiscountInr?: number;
  minSpendInr: number;
  scope: 'bill' | 'items';
  items: CouponItemInput[];
  startsAt?: string;
  expiresAt?: string;
  maxRedemptions?: number;
  perCustomerLimit?: number;
  isActive: boolean;
}

export async function createCoupon(input: CreateCouponInput, createdBy: string) {
  return withTransaction(async (client) => {
    let couponId: string;
    try {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO coupons (
           code, description, discount_type, discount_value, max_discount_inr,
           min_spend_inr, scope, starts_at, expires_at, max_redemptions,
           per_customer_limit, is_active, created_by
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
          input.code,
          input.description ?? null,
          input.discountType,
          input.discountValue,
          input.maxDiscountInr ?? null,
          input.minSpendInr,
          input.scope,
          input.startsAt ?? null,
          input.expiresAt ?? null,
          input.maxRedemptions ?? null,
          input.perCustomerLimit ?? null,
          input.isActive,
          createdBy,
        ]
      );
      couponId = rows[0].id;
    } catch (err: any) {
      if (err?.code === '23505') throw ApiError.conflict('That coupon code is already in use');
      throw err;
    }

    await insertCouponItems(client, couponId, input.scope, input.items);
    return getCoupon(couponId, client);
  });
}

interface UpdateCouponInput extends Partial<Omit<CreateCouponInput, 'items'>> {
  items?: CouponItemInput[];
}

const COLUMN_BY_KEY: Record<string, string> = {
  code: 'code',
  description: 'description',
  discountType: 'discount_type',
  discountValue: 'discount_value',
  maxDiscountInr: 'max_discount_inr',
  minSpendInr: 'min_spend_inr',
  scope: 'scope',
  startsAt: 'starts_at',
  expiresAt: 'expires_at',
  maxRedemptions: 'max_redemptions',
  perCustomerLimit: 'per_customer_limit',
  isActive: 'is_active',
};

export async function updateCoupon(id: string, patch: UpdateCouponInput) {
  return withTransaction(async (client) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const key of Object.keys(patch) as (keyof UpdateCouponInput)[]) {
      if (key === 'items' || patch[key] === undefined) continue;
      params.push(patch[key]);
      sets.push(`${COLUMN_BY_KEY[key]} = $${params.length}`);
    }

    if (sets.length) {
      params.push(id);
      try {
        const { rowCount } = await client.query(
          `UPDATE coupons SET ${sets.join(', ')} WHERE id = $${params.length}`,
          params
        );
        if (!rowCount) throw ApiError.notFound('Coupon not found');
      } catch (err: any) {
        if (err?.code === '23505') throw ApiError.conflict('That coupon code is already in use');
        throw err;
      }
    }

    if (patch.items) {
      const scopeRes = await client.query<{ scope: string }>(
        `SELECT scope FROM coupons WHERE id = $1`,
        [id]
      );
      if (!scopeRes.rowCount) throw ApiError.notFound('Coupon not found');
      await client.query(`DELETE FROM coupon_items WHERE coupon_id = $1`, [id]);
      await insertCouponItems(client, id, scopeRes.rows[0].scope as 'bill' | 'items', patch.items);
    }

    return getCoupon(id, client);
  });
}

async function insertCouponItems(
  client: PoolClient,
  couponId: string,
  scope: 'bill' | 'items',
  items: CouponItemInput[]
) {
  if (scope !== 'items' || !items.length) return;
  for (const item of items) {
    await client.query(
      `INSERT INTO coupon_items (coupon_id, item_type, service_id, product_id)
       VALUES ($1, $2, $3, $4)`,
      [
        couponId,
        item.type,
        item.type === 'service' ? item.id : null,
        item.type === 'product' ? item.id : null,
      ]
    );
  }
}

export async function listCoupons() {
  const { rows } = await query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM coupon_items ci WHERE ci.coupon_id = c.id) AS item_count
     FROM coupons c
     ORDER BY c.created_at DESC`
  );
  return rows;
}

export async function getCoupon(id: string, client?: any) {
  const runner = client ?? { query };
  const couponRes = await runner.query(`SELECT * FROM coupons WHERE id = $1`, [id]);
  if (!couponRes.rowCount) throw ApiError.notFound('Coupon not found');

  const itemsRes = await runner.query(
    `SELECT ci.item_type, ci.service_id, ci.product_id,
            COALESCE(s.name, p.name) AS name
     FROM coupon_items ci
     LEFT JOIN services s ON s.id = ci.service_id
     LEFT JOIN products p ON p.id = ci.product_id
     WHERE ci.coupon_id = $1`,
    [id]
  );

  return { ...couponRes.rows[0], items: itemsRes.rows };
}

interface CartLineForCoupon {
  type: 'service' | 'product' | 'package';
  id: string;
  lineTotalInr: number;
}

interface EligibilityResult {
  valid: boolean;
  reason?: string;
  discountInr: number;
  coupon?: any;
}

/**
 * Shared eligibility logic for both the read-only preview (Quick Bill, as
 * staff types a code) and the real redemption inside createSale's
 * transaction. `runner` is either the plain `query` function (preview) or
 * an open transaction `client` with the coupon row already locked FOR UPDATE
 * (redemption) — same optional-runner shape used elsewhere in this codebase.
 */
async function checkEligibility(
  runner: any,
  coupon: any,
  input: {
    subtotalInr: number;
    items: CartLineForCoupon[];
    customerPhone?: string;
    customerId?: string;
  }
): Promise<EligibilityResult> {
  if (!coupon.is_active)
    return { valid: false, reason: 'This coupon is no longer active', discountInr: 0 };

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, reason: 'This coupon is not active yet', discountInr: 0 };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, reason: 'This coupon has expired', discountInr: 0 };
  }
  if (input.subtotalInr < Number(coupon.min_spend_inr)) {
    return {
      valid: false,
      reason: `Needs a minimum spend of ₹${Number(coupon.min_spend_inr).toLocaleString('en-IN')}`,
      discountInr: 0,
    };
  }
  if (coupon.max_redemptions !== null && coupon.redemptions_count >= coupon.max_redemptions) {
    return { valid: false, reason: 'This coupon has reached its redemption limit', discountInr: 0 };
  }

  // Applicable base: whole bill, or just the matching line items.
  let applicableBase = input.subtotalInr;
  if (coupon.scope === 'items') {
    const itemsRes = await runner.query(
      `SELECT item_type, service_id, product_id FROM coupon_items WHERE coupon_id = $1`,
      [coupon.id]
    );
    const allowed = new Set(
      itemsRes.rows.map((r: any) => `${r.item_type}:${r.service_id ?? r.product_id}`)
    );
    applicableBase = round2(
      input.items
        .filter((l) => allowed.has(`${l.type}:${l.id}`))
        .reduce((s, l) => s + l.lineTotalInr, 0)
    );
    if (applicableBase <= 0) {
      return {
        valid: false,
        reason: "This coupon doesn't apply to anything in the current cart",
        discountInr: 0,
      };
    }
  }

  // Per-customer limit — match by linked account, else by phone (normalized
  // to the last 10 digits, same tolerant comparison used for guest-booking
  // dedupe, since a plain walk-in sale often has no customer_id at all).
  //
  // This COUNT-then-compare is a plain read with no lock of its own — it's
  // race-safe today only because every real caller (createSale) reaches
  // this via applyCoupon with the coupon row already locked FOR UPDATE, so
  // two concurrent sales for the same customer + coupon serialize on that
  // lock before either gets here. That's incidental, not enforced by this
  // function: if a second call path to checkEligibility/recordRedemption
  // is ever added without going through that same coupon-row lock, this
  // reverts to a plain TOCTOU race. A `UNIQUE` constraint or advisory lock
  // keyed to (coupon_id, customer_id/phone) would make it independently
  // safe, but isn't worth adding for a limit with no live bug today.
  if (coupon.per_customer_limit !== null && (input.customerId || input.customerPhone)) {
    const countRes = await runner.query(
      `SELECT COUNT(*) FROM coupon_redemptions
       WHERE coupon_id = $1
         AND ((customer_id IS NOT NULL AND customer_id = $2)
              OR (customer_phone IS NOT NULL AND right(regexp_replace(customer_phone, '\\D', '', 'g'), 10) = $3))`,
      [coupon.id, input.customerId ?? null, input.customerPhone ?? null]
    );
    if (Number(countRes.rows[0].count) >= coupon.per_customer_limit) {
      return { valid: false, reason: 'This coupon has already been used', discountInr: 0 };
    }
  }

  const rawDiscount =
    coupon.discount_type === 'flat'
      ? Number(coupon.discount_value)
      : round2((applicableBase * Number(coupon.discount_value)) / 100);
  const capped = coupon.max_discount_inr
    ? Math.min(rawDiscount, Number(coupon.max_discount_inr))
    : rawDiscount;
  const discountInr = round2(Math.min(capped, applicableBase));

  return { valid: true, discountInr, coupon };
}

async function findActiveCouponByCode(runner: any, code: string) {
  const { rows } = await runner.query(`SELECT * FROM coupons WHERE code_upper = UPPER($1)`, [code]);
  return rows[0] ?? null;
}

export async function previewCoupon(
  code: string,
  input: { subtotalInr: number; items: CartLineForCoupon[]; customerPhone?: string }
): Promise<EligibilityResult> {
  const coupon = await findActiveCouponByCode({ query }, code);
  if (!coupon) return { valid: false, reason: 'No coupon with that code', discountInr: 0 };
  return checkEligibility({ query }, coupon, input);
}

/**
 * The real redemption — must be called from inside the same transaction
 * that creates the sale. Locks the coupon row, re-validates everything
 * (never trusts the client's preview), and atomically guards the total
 * redemption cap with the same race-safe pattern used for stock decrement
 * in sales.service.ts. Throws on any failure; the caller's transaction
 * rolls back, so a failed sale never consumes a redemption.
 */
export async function applyCoupon(
  client: PoolClient,
  code: string,
  input: {
    subtotalInr: number;
    items: CartLineForCoupon[];
    customerPhone?: string;
    customerId?: string;
  }
): Promise<{ couponId: string; code: string; discountInr: number }> {
  const { rows } = await client.query(
    `SELECT * FROM coupons WHERE code_upper = UPPER($1) FOR UPDATE`,
    [code]
  );
  const coupon = rows[0];
  if (!coupon) throw ApiError.badRequest('No coupon with that code');

  const result = await checkEligibility(client, coupon, input);
  if (!result.valid) throw ApiError.badRequest(result.reason ?? 'This coupon cannot be applied');

  const guarded = await client.query(
    `UPDATE coupons SET redemptions_count = redemptions_count + 1
     WHERE id = $1 AND is_active
       AND (max_redemptions IS NULL OR redemptions_count < max_redemptions)`,
    [coupon.id]
  );
  if (!guarded.rowCount) {
    throw ApiError.conflict(
      'This coupon just reached its redemption limit — try another slot/code'
    );
  }

  return { couponId: coupon.id, code: coupon.code, discountInr: result.discountInr };
}

export async function recordRedemption(
  client: PoolClient,
  input: {
    couponId: string;
    saleId: string;
    customerId?: string | null;
    customerPhone?: string | null;
    discountAppliedInr: number;
    staffId: string;
  }
) {
  await client.query(
    `INSERT INTO coupon_redemptions (
       coupon_id, sale_id, customer_id, customer_phone, discount_applied_inr, redeemed_by_staff_id
     ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      input.couponId,
      input.saleId,
      input.customerId ?? null,
      input.customerPhone ?? null,
      input.discountAppliedInr,
      input.staffId,
    ]
  );
}
