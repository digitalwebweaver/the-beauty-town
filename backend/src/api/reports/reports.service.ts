import { query } from '@/config/db';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// Sales / Revenue report
// ============================================================================

export interface SalesReportData {
  from: string;
  to: string;
  summary: {
    revenueInr: number;
    salesCount: number;
    avgTicketInr: number;
    discountInr: number;
    couponDiscountInr: number;
    voidCount: number;
    voidAmountInr: number;
  };
  paymentMethods: { method: string; amountInr: number; count: number }[];
  revenueByType: { itemType: string; revenueInr: number; qty: number }[];
  topItems: { name: string; itemType: string; qty: number; revenueInr: number }[];
  dailyRevenue: { day: string; revenueInr: number; salesCount: number }[];
  voidSales: { date: string; customerName: string; amountInr: number; reason: string | null }[];
}

export async function buildSalesReportData(from: string, to: string): Promise<SalesReportData> {
  const [summaryRes, paymentRes, typeRes, topRes, dailyRes, voidRes] = await Promise.all([
    query<{
      revenue_inr: string;
      sales_count: string;
      discount_inr: string;
      coupon_discount_inr: string;
      void_count: string;
      void_amount_inr: string;
    }>(
      `SELECT
         COALESCE(SUM(total_inr) FILTER (WHERE status = 'completed'), 0) AS revenue_inr,
         COUNT(*) FILTER (WHERE status = 'completed') AS sales_count,
         COALESCE(SUM(discount_inr) FILTER (WHERE status = 'completed'), 0) AS discount_inr,
         COALESCE(SUM(coupon_discount_inr) FILTER (WHERE status = 'completed'), 0) AS coupon_discount_inr,
         COUNT(*) FILTER (WHERE status = 'void') AS void_count,
         COALESCE(SUM(total_inr) FILTER (WHERE status = 'void'), 0) AS void_amount_inr
       FROM sales
       WHERE created_at::date BETWEEN $1 AND $2`,
      [from, to]
    ),
    query<{ method: string; amount_inr: string; count: string }>(
      `SELECT sp.method, COALESCE(SUM(sp.amount_inr), 0) AS amount_inr, COUNT(*) AS count
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE s.status = 'completed' AND s.created_at::date BETWEEN $1 AND $2
       GROUP BY sp.method
       ORDER BY amount_inr DESC`,
      [from, to]
    ),
    query<{ item_type: string; revenue_inr: string; qty: string }>(
      `SELECT si.item_type, COALESCE(SUM(si.line_total_inr), 0) AS revenue_inr, SUM(si.quantity) AS qty
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND s.created_at::date BETWEEN $1 AND $2
       GROUP BY si.item_type
       ORDER BY revenue_inr DESC`,
      [from, to]
    ),
    query<{ name: string; item_type: string; qty: string; revenue_inr: string }>(
      `SELECT si.name_at_sale AS name, si.item_type, SUM(si.quantity) AS qty, SUM(si.line_total_inr) AS revenue_inr
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND s.created_at::date BETWEEN $1 AND $2
       GROUP BY si.name_at_sale, si.item_type
       ORDER BY revenue_inr DESC
       LIMIT 15`,
      [from, to]
    ),
    query<{ day: string; revenue_inr: string; sales_count: string }>(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              COALESCE(SUM(total_inr), 0) AS revenue_inr,
              COUNT(*) AS sales_count
       FROM sales
       WHERE status = 'completed' AND created_at::date BETWEEN $1 AND $2
       GROUP BY 1
       ORDER BY 1`,
      [from, to]
    ),
    query<{
      created_at: string;
      customer_name: string | null;
      total_inr: string;
      void_reason: string | null;
    }>(
      `SELECT s.created_at,
              COALESCE(cu.name, s.customer_name, 'Walk-in guest') AS customer_name,
              s.total_inr, s.void_reason
       FROM sales s
       LEFT JOIN users cu ON cu.id = s.customer_id
       WHERE s.status = 'void' AND s.created_at::date BETWEEN $1 AND $2
       ORDER BY s.created_at DESC
       LIMIT 30`,
      [from, to]
    ),
  ]);

  const s = summaryRes.rows[0];
  const revenueInr = Number(s.revenue_inr);
  const salesCount = Number(s.sales_count);

  return {
    from,
    to,
    summary: {
      revenueInr,
      salesCount,
      avgTicketInr: salesCount > 0 ? revenueInr / salesCount : 0,
      discountInr: Number(s.discount_inr),
      couponDiscountInr: Number(s.coupon_discount_inr),
      voidCount: Number(s.void_count),
      voidAmountInr: Number(s.void_amount_inr),
    },
    paymentMethods: paymentRes.rows.map((r) => ({
      method: r.method,
      amountInr: Number(r.amount_inr),
      count: Number(r.count),
    })),
    revenueByType: typeRes.rows.map((r) => ({
      itemType: r.item_type,
      revenueInr: Number(r.revenue_inr),
      qty: Number(r.qty),
    })),
    topItems: topRes.rows.map((r) => ({
      name: r.name,
      itemType: r.item_type,
      qty: Number(r.qty),
      revenueInr: Number(r.revenue_inr),
    })),
    dailyRevenue: dailyRes.rows.map((r) => ({
      day: r.day,
      revenueInr: Number(r.revenue_inr),
      salesCount: Number(r.sales_count),
    })),
    voidSales: voidRes.rows.map((r) => ({
      date: r.created_at,
      customerName: r.customer_name ?? 'Walk-in guest',
      amountInr: Number(r.total_inr),
      reason: r.void_reason,
    })),
  };
}

// ============================================================================
// Appointments report
// ============================================================================

export interface AppointmentsReportData {
  from: string;
  to: string;
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    noShowRatePct: number;
    cancellationRatePct: number;
    avgLeadDays: number;
  };
  statusBreakdown: { status: string; count: number }[];
  cancellationReasons: { reason: string; count: number }[];
  byDayOfWeek: { day: string; count: number }[];
  byHour: { hour: number; count: number }[];
  byStaff: {
    staffName: string;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }[];
}

export async function buildAppointmentsReportData(
  from: string,
  to: string
): Promise<AppointmentsReportData> {
  const [statusRes, reasonRes, dowRes, hourRes, leadRes, staffRes] = await Promise.all([
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) AS count
       FROM appointments
       WHERE appointment_date BETWEEN $1 AND $2
       GROUP BY status`,
      [from, to]
    ),
    query<{ reason: string | null; count: string }>(
      `SELECT cancellation_reason AS reason, COUNT(*) AS count
       FROM appointments
       WHERE appointment_date BETWEEN $1 AND $2 AND status = 'cancelled'
       GROUP BY cancellation_reason
       ORDER BY count DESC`,
      [from, to]
    ),
    query<{ dow: number; count: string }>(
      `SELECT EXTRACT(DOW FROM appointment_date)::int AS dow, COUNT(*) AS count
       FROM appointments
       WHERE appointment_date BETWEEN $1 AND $2 AND status NOT IN ('cancelled')
       GROUP BY 1`,
      [from, to]
    ),
    query<{ hour: number; count: string }>(
      `SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*) AS count
       FROM appointments
       WHERE appointment_date BETWEEN $1 AND $2 AND status NOT IN ('cancelled')
       GROUP BY 1
       ORDER BY 1`,
      [from, to]
    ),
    query<{ avg_lead_days: string | null }>(
      `SELECT AVG(EXTRACT(EPOCH FROM ((appointment_date + start_time)::timestamp - created_at)) / 86400) AS avg_lead_days
       FROM appointments
       WHERE appointment_date BETWEEN $1 AND $2 AND status <> 'cancelled'`,
      [from, to]
    ),
    query<{
      staff_name: string | null;
      total: string;
      completed: string;
      cancelled: string;
      no_show: string;
    }>(
      `SELECT COALESCE(st.name, 'Unassigned') AS staff_name,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE a.status = 'completed') AS completed,
              COUNT(*) FILTER (WHERE a.status = 'cancelled') AS cancelled,
              COUNT(*) FILTER (WHERE a.status = 'no_show') AS no_show
       FROM appointments a
       LEFT JOIN users st ON st.id = a.staff_id
       WHERE a.appointment_date BETWEEN $1 AND $2
       GROUP BY st.name
       ORDER BY total DESC`,
      [from, to]
    ),
  ]);

  const statusMap: Record<string, number> = {};
  for (const r of statusRes.rows) statusMap[r.status] = Number(r.count);
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const completed = statusMap.completed ?? 0;
  const cancelled = statusMap.cancelled ?? 0;
  const noShow = statusMap.no_show ?? 0;

  const dowMap = new Map(dowRes.rows.map((r) => [Number(r.dow), Number(r.count)]));
  const byDayOfWeek = DAY_LABELS.map((label, i) => ({ day: label, count: dowMap.get(i) ?? 0 }));

  return {
    from,
    to,
    summary: {
      total,
      completed,
      cancelled,
      noShow,
      pending: statusMap.pending ?? 0,
      confirmed: statusMap.confirmed ?? 0,
      inProgress: statusMap.in_progress ?? 0,
      noShowRatePct: total > 0 ? (noShow / total) * 100 : 0,
      cancellationRatePct: total > 0 ? (cancelled / total) * 100 : 0,
      avgLeadDays: Number(leadRes.rows[0]?.avg_lead_days ?? 0),
    },
    statusBreakdown: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    cancellationReasons: reasonRes.rows.map((r) => ({
      reason: r.reason?.trim() || 'No reason given',
      count: Number(r.count),
    })),
    byDayOfWeek,
    byHour: hourRes.rows.map((r) => ({ hour: Number(r.hour), count: Number(r.count) })),
    byStaff: staffRes.rows.map((r) => ({
      staffName: r.staff_name ?? 'Unassigned',
      total: Number(r.total),
      completed: Number(r.completed),
      cancelled: Number(r.cancelled),
      noShow: Number(r.no_show),
    })),
  };
}

// ============================================================================
// Staff performance report
// ============================================================================

export interface StaffReportRow {
  id: string;
  name: string;
  roleTitle: string | null;
  revenueInr: number;
  salesCount: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  noShowRatePct: number;
  avgRating: number | null;
  reviewCount: number;
  couponRedemptions: number;
}

export interface StaffReportData {
  from: string;
  to: string;
  summary: {
    staffCount: number;
    totalRevenueInr: number;
    totalAppointmentsCompleted: number;
    avgRating: number | null;
  };
  rows: StaffReportRow[];
}

export async function buildStaffReportData(from: string, to: string): Promise<StaffReportData> {
  const { rows } = await query<{
    id: string;
    name: string;
    role_title: string | null;
    revenue_inr: string;
    sales_count: string;
    total_appointments: string;
    completed_appointments: string;
    cancelled_appointments: string;
    no_show_appointments: string;
    avg_rating: string | null;
    review_count: string;
    coupon_redemptions: string;
  }>(
    `SELECT u.id, u.name, sp.role_title,
            COALESCE(sale_agg.revenue_inr, 0) AS revenue_inr,
            COALESCE(sale_agg.sales_count, 0) AS sales_count,
            COALESCE(appt_agg.total, 0) AS total_appointments,
            COALESCE(appt_agg.completed, 0) AS completed_appointments,
            COALESCE(appt_agg.cancelled, 0) AS cancelled_appointments,
            COALESCE(appt_agg.no_show, 0) AS no_show_appointments,
            review_agg.avg_rating,
            COALESCE(review_agg.review_count, 0) AS review_count,
            COALESCE(coupon_agg.redemptions, 0) AS coupon_redemptions
     FROM users u
     JOIN staff_profiles sp ON sp.user_id = u.id
     LEFT JOIN (
       SELECT staff_id, SUM(total_inr) AS revenue_inr, COUNT(*) AS sales_count
       FROM sales
       WHERE status = 'completed' AND created_at::date BETWEEN $1 AND $2
       GROUP BY staff_id
     ) sale_agg ON sale_agg.staff_id = u.id
     LEFT JOIN (
       SELECT staff_id,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed,
              COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
              COUNT(*) FILTER (WHERE status = 'no_show') AS no_show
       FROM appointments
       WHERE appointment_date BETWEEN $1 AND $2
       GROUP BY staff_id
     ) appt_agg ON appt_agg.staff_id = u.id
     LEFT JOIN (
       SELECT staff_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS review_count
       FROM reviews
       WHERE is_published AND created_at::date BETWEEN $1 AND $2
       GROUP BY staff_id
     ) review_agg ON review_agg.staff_id = u.id
     LEFT JOIN (
       SELECT redeemed_by_staff_id AS staff_id, COUNT(*) AS redemptions
       FROM coupon_redemptions
       WHERE redeemed_at::date BETWEEN $1 AND $2
       GROUP BY redeemed_by_staff_id
     ) coupon_agg ON coupon_agg.staff_id = u.id
     WHERE u.role = 'staff' AND sp.is_active
     ORDER BY revenue_inr DESC NULLS LAST, u.name ASC`,
    [from, to]
  );

  const staffRows: StaffReportRow[] = rows.map((r) => {
    const total = Number(r.total_appointments);
    const noShow = Number(r.no_show_appointments);
    return {
      id: r.id,
      name: r.name,
      roleTitle: r.role_title,
      revenueInr: Number(r.revenue_inr),
      salesCount: Number(r.sales_count),
      totalAppointments: total,
      completedAppointments: Number(r.completed_appointments),
      cancelledAppointments: Number(r.cancelled_appointments),
      noShowAppointments: noShow,
      noShowRatePct: total > 0 ? (noShow / total) * 100 : 0,
      avgRating: r.avg_rating != null ? Number(r.avg_rating) : null,
      reviewCount: Number(r.review_count),
      couponRedemptions: Number(r.coupon_redemptions),
    };
  });

  const ratedRows = staffRows.filter((r) => r.avgRating != null);

  return {
    from,
    to,
    summary: {
      staffCount: staffRows.length,
      totalRevenueInr: staffRows.reduce((sum, r) => sum + r.revenueInr, 0),
      totalAppointmentsCompleted: staffRows.reduce((sum, r) => sum + r.completedAppointments, 0),
      avgRating: ratedRows.length
        ? ratedRows.reduce((sum, r) => sum + (r.avgRating ?? 0), 0) / ratedRows.length
        : null,
    },
    rows: staffRows,
  };
}
