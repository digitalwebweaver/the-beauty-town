import { query } from '@/config/db';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface GlobalsRow {
  lifetime_revenue_inr: string;
  total_customers: string;
  active_staff: string;
  appointments_today: string;
}

// `lifetime_revenue_inr` and `total_customers` are full-table aggregates
// with no time bound at all — every completed sale ever rung up, every
// customer ever registered — recomputed on every single dashboard load.
// The dashboard gets refreshed/polled far more often than these figures
// meaningfully change, so a short in-process cache avoids re-scanning the
// whole table on each request without needing new infra (Redis etc.) for
// a number this cheap to keep briefly stale.
const GLOBALS_CACHE_TTL_MS = 60_000;
let globalsCache: { data: GlobalsRow; expiresAt: number } | null = null;

async function getGlobals(): Promise<GlobalsRow> {
  if (globalsCache && globalsCache.expiresAt > Date.now()) return globalsCache.data;
  const { rows } = await query<GlobalsRow>(
    `SELECT
       (SELECT COALESCE(SUM(total_inr),0) FROM sales WHERE status='completed') AS lifetime_revenue_inr,
       (SELECT COUNT(*) FROM users WHERE role='customer') AS total_customers,
       (SELECT COUNT(*) FROM staff_profiles WHERE is_active) AS active_staff,
       (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE) AS appointments_today`
  );
  globalsCache = { data: rows[0], expiresAt: Date.now() + GLOBALS_CACHE_TTL_MS };
  return globalsCache.data;
}

/**
 * Everything the admin analytics dashboard needs, for a given trailing
 * window (`days`). One call, ~14 independent read queries run in parallel —
 * revenue and payment-method figures come from `sales`/`sale_payments` (the
 * actual POS ledger, not appointment estimates), booking-demand figures
 * come from `appointments`.
 */
export async function getDashboardAnalytics(days: number) {
  const now = new Date();
  const since = new Date(now.getTime() - days * 86_400_000);
  const prevSince = new Date(now.getTime() - 2 * days * 86_400_000);
  const sinceISO = since.toISOString();
  const prevSinceISO = prevSince.toISOString();
  const sinceDate = toDateStr(since);

  const [
    globals,
    summary,
    revenueSeriesRes,
    appointmentStatusRes,
    paymentMethodRes,
    topServicesRes,
    topProductsRes,
    categoryRevenueRes,
    staffPerfRes,
    peakHoursRes,
    dowRes,
    customerMixRes,
    lowStockRes,
    couponPerfRes,
    reviewsRes,
  ] = await Promise.all([
    getGlobals(),
    query<{
      revenue_inr: string;
      sales_count: string;
      prev_revenue_inr: string;
      prev_sales_count: string;
      coupon_discount_inr: string;
      coupon_redemptions: string;
    }>(
      `SELECT
         COALESCE(SUM(total_inr) FILTER (WHERE created_at >= $1), 0) AS revenue_inr,
         COUNT(*) FILTER (WHERE created_at >= $1) AS sales_count,
         COALESCE(SUM(total_inr) FILTER (WHERE created_at >= $2 AND created_at < $1), 0) AS prev_revenue_inr,
         COUNT(*) FILTER (WHERE created_at >= $2 AND created_at < $1) AS prev_sales_count,
         COALESCE(SUM(coupon_discount_inr) FILTER (WHERE created_at >= $1), 0) AS coupon_discount_inr,
         COUNT(*) FILTER (WHERE created_at >= $1 AND coupon_id IS NOT NULL) AS coupon_redemptions
       FROM sales WHERE status = 'completed'`,
      [sinceISO, prevSinceISO]
    ),
    query<{ day: string; revenue_inr: string; sales_count: string }>(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              COALESCE(SUM(total_inr),0) AS revenue_inr,
              COUNT(*) AS sales_count
       FROM sales
       WHERE status = 'completed' AND created_at >= $1
       GROUP BY 1 ORDER BY 1`,
      [sinceISO]
    ),
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) AS count
       FROM appointments
       WHERE appointment_date >= $1::date
       GROUP BY status`,
      [sinceDate]
    ),
    query<{ method: string; amount_inr: string; count: string }>(
      `SELECT sp.method, COALESCE(SUM(sp.amount_inr),0) AS amount_inr, COUNT(*) AS count
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE s.status = 'completed' AND s.created_at >= $1
       GROUP BY sp.method`,
      [sinceISO]
    ),
    query<{ name: string; qty: string; revenue_inr: string }>(
      `SELECT si.name_at_sale AS name, SUM(si.quantity) AS qty, SUM(si.line_total_inr) AS revenue_inr
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND s.created_at >= $1 AND si.item_type = 'service'
       GROUP BY si.name_at_sale
       ORDER BY revenue_inr DESC
       LIMIT 8`,
      [sinceISO]
    ),
    query<{ name: string; qty: string; revenue_inr: string }>(
      `SELECT si.name_at_sale AS name, SUM(si.quantity) AS qty, SUM(si.line_total_inr) AS revenue_inr
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND s.created_at >= $1 AND si.item_type = 'product'
       GROUP BY si.name_at_sale
       ORDER BY revenue_inr DESC
       LIMIT 8`,
      [sinceISO]
    ),
    query<{ label: string; revenue_inr: string }>(
      `SELECT label, SUM(revenue_inr) AS revenue_inr FROM (
         SELECT sc.label AS label, si.line_total_inr AS revenue_inr
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         JOIN services sv ON sv.id = si.service_id
         JOIN service_categories sc ON sc.id = sv.category_id
         WHERE si.item_type = 'service' AND s.status = 'completed' AND s.created_at >= $1
         UNION ALL
         SELECT COALESCE(p.category, 'Other') AS label, si.line_total_inr AS revenue_inr
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         JOIN products p ON p.id = si.product_id
         WHERE si.item_type = 'product' AND s.status = 'completed' AND s.created_at >= $1
       ) t
       GROUP BY label
       ORDER BY revenue_inr DESC`,
      [sinceISO]
    ),
    query<{
      id: string;
      name: string;
      avatar_url: string | null;
      role_title: string;
      rating: string;
      revenue_inr: string;
      sales_count: string;
      appointments_count: string;
    }>(
      `SELECT u.id, u.name, u.avatar_url, sp.role_title, sp.rating,
              COALESCE(sale_agg.revenue_inr, 0) AS revenue_inr,
              COALESCE(sale_agg.sales_count, 0) AS sales_count,
              COALESCE(appt_agg.appt_count, 0) AS appointments_count
       FROM users u
       JOIN staff_profiles sp ON sp.user_id = u.id
       LEFT JOIN (
         SELECT staff_id, SUM(total_inr) AS revenue_inr, COUNT(*) AS sales_count
         FROM sales WHERE status = 'completed' AND created_at >= $1
         GROUP BY staff_id
       ) sale_agg ON sale_agg.staff_id = u.id
       LEFT JOIN (
         SELECT staff_id, COUNT(*) AS appt_count
         FROM appointments WHERE appointment_date >= $2::date AND status = 'completed'
         GROUP BY staff_id
       ) appt_agg ON appt_agg.staff_id = u.id
       WHERE u.role = 'staff' AND sp.is_active
       ORDER BY revenue_inr DESC NULLS LAST`,
      [sinceISO, sinceDate]
    ),
    query<{ hour: number; count: string }>(
      `SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*) AS count
       FROM appointments
       WHERE appointment_date >= $1::date AND status NOT IN ('cancelled')
       GROUP BY 1 ORDER BY 1`,
      [sinceDate]
    ),
    query<{ dow: number; count: string }>(
      `SELECT EXTRACT(DOW FROM appointment_date)::int AS dow, COUNT(*) AS count
       FROM appointments
       WHERE appointment_date >= $1::date AND status NOT IN ('cancelled')
       GROUP BY 1 ORDER BY 1`,
      [sinceDate]
    ),
    query<{ returning_customers: string; new_customers: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE u.created_at < $1) AS returning_customers,
         COUNT(*) FILTER (WHERE u.created_at >= $1) AS new_customers
       FROM (
         SELECT DISTINCT customer_id FROM sales
         WHERE status = 'completed' AND created_at >= $1 AND customer_id IS NOT NULL
       ) t
       JOIN users u ON u.id = t.customer_id`,
      [sinceISO]
    ),
    query<{ id: string; name: string; stock: number; reorder_level: number }>(
      `SELECT id, name, stock, reorder_level
       FROM products
       WHERE is_active AND stock <= reorder_level
       ORDER BY stock ASC
       LIMIT 10`
    ),
    query<{ code: string; redemptions: string; discount_inr: string }>(
      `SELECT c.code, COUNT(cr.id) AS redemptions, COALESCE(SUM(cr.discount_applied_inr),0) AS discount_inr
       FROM coupon_redemptions cr
       JOIN coupons c ON c.id = cr.coupon_id
       WHERE cr.redeemed_at >= $1
       GROUP BY c.code
       ORDER BY redemptions DESC
       LIMIT 5`,
      [sinceISO]
    ),
    query<{
      avg_rating: string | null;
      count: string;
      r5: string;
      r4: string;
      r3: string;
      r2: string;
      r1: string;
    }>(
      `SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS count,
              COUNT(*) FILTER (WHERE rating = 5) AS r5,
              COUNT(*) FILTER (WHERE rating = 4) AS r4,
              COUNT(*) FILTER (WHERE rating = 3) AS r3,
              COUNT(*) FILTER (WHERE rating = 2) AS r2,
              COUNT(*) FILTER (WHERE rating = 1) AS r1
       FROM reviews WHERE is_published AND created_at >= $1`,
      [sinceISO]
    ),
  ]);

  // Gapless daily revenue series — fill in $0 for days with no sales so the
  // chart doesn't silently skip them.
  const byDay = new Map(revenueSeriesRes.rows.map((r) => [r.day, r]));
  const revenueSeries: { date: string; revenueInr: number; salesCount: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = toDateStr(new Date(now.getTime() - i * 86_400_000));
    const row = byDay.get(d);
    revenueSeries.push({
      date: d,
      revenueInr: row ? Number(row.revenue_inr) : 0,
      salesCount: row ? Number(row.sales_count) : 0,
    });
  }

  const g = globals;
  const s = summary.rows[0];
  const revenueInr = Number(s.revenue_inr);
  const prevRevenueInr = Number(s.prev_revenue_inr);
  const salesCount = Number(s.sales_count);

  const apptStatus = appointmentStatusRes.rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = Number(r.count);
    return acc;
  }, {});
  const totalAppointments = Object.values(apptStatus).reduce((a, b) => a + b, 0);
  const noShowCount = apptStatus.no_show ?? 0;

  // Hour-of-day peak, filled 0-23 so the chart has a consistent x-axis.
  const hourMap = new Map(peakHoursRes.rows.map((r) => [Number(r.hour), Number(r.count)]));
  const peakHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap.get(h) ?? 0 }));

  // Day-of-week, filled Sun-Sat.
  const dowMap = new Map(dowRes.rows.map((r) => [Number(r.dow), Number(r.count)]));
  const bookingsByDay = DAY_LABELS.map((label, i) => ({ day: label, count: dowMap.get(i) ?? 0 }));

  const cm = customerMixRes.rows[0];
  const rv = reviewsRes.rows[0];

  return {
    range: { days, since: sinceISO },
    summary: {
      revenueInr,
      revenueChangePct:
        prevRevenueInr > 0 ? ((revenueInr - prevRevenueInr) / prevRevenueInr) * 100 : null,
      salesCount,
      avgTicketInr: salesCount > 0 ? revenueInr / salesCount : 0,
      totalAppointments,
      completedAppointments: apptStatus.completed ?? 0,
      noShowRatePct: totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0,
      newCustomers: Number(cm?.new_customers ?? 0),
      returningCustomers: Number(cm?.returning_customers ?? 0),
      couponRedemptions: Number(s.coupon_redemptions),
      couponDiscountInr: Number(s.coupon_discount_inr),
      lifetimeRevenueInr: Number(g.lifetime_revenue_inr),
      totalCustomers: Number(g.total_customers),
      activeStaffCount: Number(g.active_staff),
      appointmentsToday: Number(g.appointments_today),
      lowStockCount: lowStockRes.rows.length,
    },
    revenueSeries,
    appointmentStatusBreakdown: Object.entries(apptStatus).map(([status, count]) => ({
      status,
      count,
    })),
    paymentMethodBreakdown: paymentMethodRes.rows.map((r) => ({
      method: r.method,
      amountInr: Number(r.amount_inr),
      count: Number(r.count),
    })),
    topServices: topServicesRes.rows.map((r) => ({
      name: r.name,
      qty: Number(r.qty),
      revenueInr: Number(r.revenue_inr),
    })),
    topProducts: topProductsRes.rows.map((r) => ({
      name: r.name,
      qty: Number(r.qty),
      revenueInr: Number(r.revenue_inr),
    })),
    categoryRevenue: categoryRevenueRes.rows.map((r) => ({
      label: r.label,
      revenueInr: Number(r.revenue_inr),
    })),
    staffPerformance: staffPerfRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatar_url,
      roleTitle: r.role_title,
      rating: Number(r.rating),
      revenueInr: Number(r.revenue_inr),
      salesCount: Number(r.sales_count),
      appointmentsCount: Number(r.appointments_count),
    })),
    peakHours,
    bookingsByDay,
    lowStockProducts: lowStockRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      stock: r.stock,
      reorderLevel: r.reorder_level,
    })),
    couponPerformance: couponPerfRes.rows.map((r) => ({
      code: r.code,
      redemptions: Number(r.redemptions),
      discountInr: Number(r.discount_inr),
    })),
    reviews: {
      avgRating: rv?.avg_rating ? Number(rv.avg_rating) : 0,
      count: Number(rv?.count ?? 0),
      breakdown: [
        { stars: 5, count: Number(rv?.r5 ?? 0) },
        { stars: 4, count: Number(rv?.r4 ?? 0) },
        { stars: 3, count: Number(rv?.r3 ?? 0) },
        { stars: 2, count: Number(rv?.r2 ?? 0) },
        { stars: 1, count: Number(rv?.r1 ?? 0) },
      ],
    },
  };
}
