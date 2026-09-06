import { query, withTransaction } from '@/config/db';
import { ApiError } from '@/utils/ApiError';
import { applyCoupon, recordRedemption } from '@/api/coupons/coupons.service';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface SaleItemInput {
  type: 'service' | 'product' | 'package';
  id: string;
  quantity: number;
  discountInr: number;
  unitPriceInr?: number;
}

interface PaymentInput {
  method: 'cash' | 'card' | 'upi';
  amountInr: number;
}

interface CreateSaleInput {
  appointmentId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItemInput[];
  discountInr: number;
  couponCode?: string;
  payments: PaymentInput[];
  notes?: string;
}

export async function createSale(input: CreateSaleInput, staffId: string) {
  return withTransaction(async (client) => {
    // 1. If checking out an appointment: lock it, make sure it's billable,
    //    and make sure it hasn't already been billed once before.
    if (input.appointmentId) {
      const apRes = await client.query<{ status: string }>(
        `SELECT status FROM appointments WHERE id = $1 FOR UPDATE`,
        [input.appointmentId]
      );
      if (!apRes.rowCount) throw ApiError.badRequest('Appointment not found');
      if (['cancelled', 'no_show'].includes(apRes.rows[0].status)) {
        throw ApiError.badRequest('That appointment was cancelled — nothing to bill');
      }
      const existing = await client.query(
        `SELECT 1 FROM sales WHERE appointment_id = $1 AND status = 'completed'`,
        [input.appointmentId]
      );
      if (existing.rowCount) {
        throw ApiError.conflict('This appointment has already been billed');
      }
    }

    // 2. Lock every referenced service/product row and validate it.
    const serviceIds = input.items.filter((i) => i.type === 'service').map((i) => i.id);
    const productIds = input.items.filter((i) => i.type === 'product').map((i) => i.id);

    const servicesById = new Map<
      string,
      { id: string; name: string; price_inr: string; is_active: boolean }
    >();
    if (serviceIds.length) {
      const res = await client.query<{
        id: string;
        name: string;
        price_inr: string;
        is_active: boolean;
      }>(
        `SELECT id, name, price_inr, is_active FROM services WHERE id = ANY($1::uuid[]) FOR SHARE`,
        [serviceIds]
      );
      if (res.rows.length !== new Set(serviceIds).size) {
        throw ApiError.badRequest('One or more services not found');
      }
      for (const r of res.rows) {
        if (!r.is_active) throw ApiError.badRequest(`"${r.name}" is no longer offered`);
        servicesById.set(r.id, r);
      }
    }

    const productsById = new Map<
      string,
      { id: string; name: string; price_inr: string; stock: number; is_active: boolean }
    >();
    if (productIds.length) {
      const res = await client.query<{
        id: string;
        name: string;
        price_inr: string;
        stock: number;
        is_active: boolean;
      }>(
        `SELECT id, name, price_inr, stock, is_active FROM products WHERE id = ANY($1::uuid[]) FOR UPDATE`,
        [productIds]
      );
      if (res.rows.length !== new Set(productIds).size) {
        throw ApiError.badRequest('One or more products not found');
      }
      for (const r of res.rows) {
        if (!r.is_active) throw ApiError.badRequest(`"${r.name}" is no longer sold`);
        productsById.set(r.id, r);
      }
    }

    const packageIds = input.items.filter((i) => i.type === 'package').map((i) => i.id);
    const packagesById = new Map<
      string,
      { id: string; name: string; price_inr: string; is_active: boolean }
    >();
    if (packageIds.length) {
      const res = await client.query<{
        id: string;
        name: string;
        price_inr: string;
        is_active: boolean;
      }>(
        `SELECT id, name, price_inr, is_active FROM packages WHERE id = ANY($1::uuid[]) FOR SHARE`,
        [packageIds]
      );
      if (res.rows.length !== new Set(packageIds).size) {
        throw ApiError.badRequest('One or more packages not found');
      }
      for (const r of res.rows) {
        if (!r.is_active) throw ApiError.badRequest(`"${r.name}" is no longer offered`);
        packagesById.set(r.id, r);
      }
    }

    // 3. Price every line from the locked rows — never trust client prices,
    //    except a per-line override, and only when the salon has actually
    //    turned that on (re-checked here, not just in the UI, so a direct
    //    API call can't bill an arbitrary price while the setting is off).
    const settingsRes = await client.query<{ allow_price_override: boolean }>(
      `SELECT allow_price_override FROM salon_settings WHERE id = 1`
    );
    const allowPriceOverride = settingsRes.rows[0]?.allow_price_override ?? false;

    let subtotal = 0;
    let itemDiscountTotal = 0;
    const lines: {
      itemType: 'service' | 'product' | 'package';
      serviceId: string | null;
      productId: string | null;
      packageId: string | null;
      name: string;
      unitPrice: number;
      quantity: number;
      discount: number;
      lineTotal: number;
    }[] = [];

    for (const item of input.items) {
      const src =
        item.type === 'service'
          ? servicesById.get(item.id)
          : item.type === 'product'
            ? productsById.get(item.id)
            : packagesById.get(item.id);
      if (!src) throw ApiError.badRequest('Unknown item in cart');

      const unitPrice =
        allowPriceOverride && item.unitPriceInr !== undefined
          ? item.unitPriceInr
          : Number(src.price_inr);
      const gross = round2(unitPrice * item.quantity);
      if (item.discountInr > gross) {
        throw ApiError.badRequest(`Discount on "${src.name}" can't exceed its own line total`);
      }
      const lineTotal = round2(gross - item.discountInr);

      subtotal = round2(subtotal + gross);
      itemDiscountTotal = round2(itemDiscountTotal + item.discountInr);

      lines.push({
        itemType: item.type,
        serviceId: item.type === 'service' ? item.id : null,
        productId: item.type === 'product' ? item.id : null,
        packageId: item.type === 'package' ? item.id : null,
        name: src.name,
        unitPrice,
        quantity: item.quantity,
        discount: item.discountInr,
        lineTotal,
      });
    }

    // 3.5. Apply a coupon, if one was given. This locks the coupon row and
    //      atomically reserves the redemption inside THIS transaction — if
    //      anything later fails, the whole thing (including the reservation)
    //      rolls back, so a failed sale never consumes a redemption.
    let coupon: { couponId: string; code: string; discountInr: number } | null = null;
    if (input.couponCode) {
      coupon = await applyCoupon(client, input.couponCode, {
        subtotalInr: subtotal,
        items: lines.map((l) => ({
          type: l.itemType,
          id: (l.serviceId ?? l.productId ?? l.packageId) as string,
          lineTotalInr: l.lineTotal,
        })),
        customerPhone: input.customerPhone,
        customerId: input.customerId,
      });
    }
    const couponDiscount = coupon?.discountInr ?? 0;

    const totalDiscount = round2(itemDiscountTotal + input.discountInr + couponDiscount);
    if (totalDiscount > subtotal) {
      throw ApiError.badRequest("Discount can't exceed the bill subtotal");
    }
    const total = round2(subtotal - totalDiscount);

    // 4. Payments must add up to the total exactly (2-decimal tolerance).
    const paid = round2(input.payments.reduce((s, p) => s + p.amountInr, 0));
    if (Math.abs(paid - total) > 0.01) {
      throw ApiError.badRequest(
        `Payments add up to ₹${paid.toFixed(2)} but the bill total is ₹${total.toFixed(2)}`
      );
    }

    // 5. Insert the sale header.
    const saleRes = await client.query<{ id: string }>(
      `INSERT INTO sales (
         appointment_id, customer_id, customer_name, customer_phone, staff_id,
         subtotal_inr, discount_inr, total_inr,
         coupon_id, coupon_code, coupon_discount_inr, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        input.appointmentId ?? null,
        input.customerId ?? null,
        input.customerName ?? null,
        input.customerPhone ?? null,
        staffId,
        subtotal,
        totalDiscount,
        total,
        coupon?.couponId ?? null,
        coupon?.code ?? null,
        couponDiscount,
        input.notes ?? null,
      ]
    );
    const saleId = saleRes.rows[0].id;

    if (coupon) {
      await recordRedemption(client, {
        couponId: coupon.couponId,
        saleId,
        customerId: input.customerId ?? null,
        customerPhone: input.customerPhone ?? null,
        discountAppliedInr: coupon.discountInr,
        staffId,
      });
    }

    // 6. Insert line items, snapshotting name + price at this moment.
    for (const line of lines) {
      await client.query(
        `INSERT INTO sale_items (
           sale_id, item_type, service_id, product_id, package_id, name_at_sale,
           unit_price_inr, quantity, discount_inr, line_total_inr
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          saleId,
          line.itemType,
          line.serviceId,
          line.productId,
          line.packageId,
          line.name,
          line.unitPrice,
          line.quantity,
          line.discount,
          line.lineTotal,
        ]
      );
    }

    // 7. Decrement stock — aggregate quantity per product first in case the
    //    same product appears as more than one line, then apply a guarded
    //    UPDATE so a race can never push stock negative.
    const qtyByProduct = new Map<string, number>();
    for (const line of lines) {
      if (!line.productId) continue;
      qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) ?? 0) + line.quantity);
    }
    for (const [productId, qty] of qtyByProduct) {
      const upd = await client.query(
        `UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2`,
        [productId, qty]
      );
      if (!upd.rowCount) {
        const name = productsById.get(productId)?.name ?? 'That product';
        throw ApiError.conflict(`${name} doesn't have enough stock left`);
      }
    }

    // 8. Insert payments.
    for (const p of input.payments) {
      await client.query(
        `INSERT INTO sale_payments (sale_id, method, amount_inr) VALUES ($1, $2, $3)`,
        [saleId, p.method, p.amountInr]
      );
    }

    // 9. Checking out an appointment closes it out, in the same transaction.
    if (input.appointmentId) {
      await client.query(
        `UPDATE appointments SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [input.appointmentId]
      );
    }

    return getSaleById(saleId, client);
  });
}

export async function getSaleById(id: string, client?: any) {
  const runner = client ?? { query };
  const { rows } = await runner.query(
    `SELECT s.id, s.appointment_id, s.customer_id,
            COALESCE(cu.name, s.customer_name) AS customer_name,
            COALESCE(cu.phone, s.customer_phone) AS customer_phone,
            s.staff_id, st.name AS staff_name,
            s.subtotal_inr, s.discount_inr, s.total_inr, s.status,
            s.coupon_id, s.coupon_code, s.coupon_discount_inr,
            s.notes, s.voided_at, s.void_reason, s.created_at,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'id', si.id,
                 'itemType', si.item_type,
                 'name', si.name_at_sale,
                 'unitPrice', si.unit_price_inr,
                 'quantity', si.quantity,
                 'discount', si.discount_inr,
                 'lineTotal', si.line_total_inr
               ) ORDER BY si.item_type, si.name_at_sale)
               FROM sale_items si WHERE si.sale_id = s.id),
              '[]'::json
            ) AS items,
            COALESCE(
              (SELECT json_agg(json_build_object('method', sp.method, 'amount', sp.amount_inr))
               FROM sale_payments sp WHERE sp.sale_id = s.id),
              '[]'::json
            ) AS payments
     FROM sales s
     LEFT JOIN users cu ON cu.id = s.customer_id
     LEFT JOIN users st ON st.id = s.staff_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0];
}

export async function listSales(filters: {
  status?: string;
  staffId?: string;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  pageSize: number;
}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    where.push(`s.status = $${params.length}`);
  }
  if (filters.staffId) {
    params.push(filters.staffId);
    where.push(`s.staff_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`s.created_at::date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`s.created_at::date <= $${params.length}`);
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(
      `(COALESCE(cu.name, s.customer_name) ILIKE $${params.length} OR st.name ILIKE $${params.length})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*) FROM sales s
     LEFT JOIN users cu ON cu.id = s.customer_id
     LEFT JOIN users st ON st.id = s.staff_id
     ${clause}`,
    params
  );
  const total = Number(countRes.rows[0].count);

  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const { rows } = await query(
    `SELECT s.id, s.appointment_id,
            COALESCE(cu.name, s.customer_name) AS customer_name,
            st.name AS staff_name,
            s.subtotal_inr, s.discount_inr, s.total_inr, s.status, s.created_at,
            (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count
     FROM sales s
     LEFT JOIN users cu ON cu.id = s.customer_id
     LEFT JOIN users st ON st.id = s.staff_id
     ${clause}
     ORDER BY s.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...params, filters.pageSize, (filters.page - 1) * filters.pageSize]
  );
  return { rows, total };
}

export async function listMySales(staffId: string, pagination: { page: number; pageSize: number }) {
  return listSales({ staffId, ...pagination });
}

export async function voidSale(id: string, reason: string | undefined) {
  return withTransaction(async (client) => {
    const saleRes = await client.query<{ status: string }>(
      `SELECT status FROM sales WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!saleRes.rowCount) throw ApiError.notFound('Sale not found');
    if (saleRes.rows[0].status === 'void') {
      throw ApiError.badRequest('That sale is already void');
    }

    // Restock any product lines this sale had decremented.
    const itemsRes = await client.query<{ product_id: string; quantity: number }>(
      `SELECT product_id, quantity FROM sale_items
       WHERE sale_id = $1 AND item_type = 'product'`,
      [id]
    );
    for (const row of itemsRes.rows) {
      await client.query(`UPDATE products SET stock = stock + $2 WHERE id = $1`, [
        row.product_id,
        row.quantity,
      ]);
    }

    await client.query(
      `UPDATE sales SET status = 'void', voided_at = NOW(), void_reason = $2 WHERE id = $1`,
      [id, reason ?? null]
    );

    return getSaleById(id, client);
  });
}
