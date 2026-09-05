import { query } from '@/config/db';

export interface CouponTemplateDesignRow {
  id: number;
  design: unknown;
  updated_by: string | null;
  updated_at: string;
}

/**
 * There is always exactly one row (id = 1, enforced by a CHECK constraint) —
 * same singleton pattern as salon_settings. `design` is an opaque JSON blob
 * whose shape is owned by the frontend (frontend/src/lib/couponDesign.ts).
 */
export async function getCouponDesign(): Promise<CouponTemplateDesignRow> {
  const { rows } = await query<CouponTemplateDesignRow>(
    `SELECT * FROM coupon_template_design WHERE id = 1`
  );
  return rows[0];
}

export async function saveCouponDesign(
  design: unknown,
  updatedBy: string
): Promise<CouponTemplateDesignRow> {
  const { rows } = await query<CouponTemplateDesignRow>(
    `UPDATE coupon_template_design
     SET design = $1, updated_by = $2
     WHERE id = 1
     RETURNING *`,
    [JSON.stringify(design), updatedBy]
  );
  return rows[0];
}
