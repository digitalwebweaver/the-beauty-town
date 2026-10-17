// Excel (.xlsx) counterparts to the PDF report documents — same data, same
// three report types, built with ExcelJS instead of react-pdf. Kept as a
// separate module (not touching SalesReportDocument.tsx etc.) since the two
// output formats share nothing but the already-computed report data.
import ExcelJS from 'exceljs';
import type { SalonSettingsRow } from '@/api/settings/settings.repository';
import type {
  AppointmentsReportData,
  SalesReportData,
  StaffReportData,
} from '@/api/reports/reports.service';
import { formatTime } from './format';

const INR_FMT = '"₹"#,##0';
const PCT_FMT = '0.0"%"';
const DATE_FMT = 'dd mmm yyyy';
const DATETIME_FMT = 'dd mmm yyyy hh:mm AM/PM';

interface Column<T> {
  header: string;
  key: keyof T & string;
  width?: number;
  numFmt?: string;
}

function addTable<T extends Record<string, unknown>>(
  wb: ExcelJS.Workbook,
  sheetName: string,
  columns: Column<T>[],
  rows: T[]
) {
  const sheet = wb.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3E0D1' },
  };
  rows.forEach((r) => sheet.addRow(r));
  columns.forEach((c, i) => {
    if (c.numFmt) sheet.getColumn(i + 1).numFmt = c.numFmt;
  });
  if (rows.length === 0) {
    sheet.addRow({} as T);
    sheet.getCell(2, 1).value = 'No data for this date range.';
    sheet.getCell(2, 1).font = { italic: true, color: { argb: 'FF888888' } };
  }
  return sheet;
}

/** A simple label/value summary block — same sheet, just a different shape
 * than the tabular ones above (a handful of headline metrics, not rows). */
function addSummarySheet(
  wb: ExcelJS.Workbook,
  title: string,
  settings: SalonSettingsRow,
  from: string,
  to: string,
  metrics: { label: string; value: string | number; numFmt?: string }[]
) {
  const sheet = wb.addWorksheet('Summary');
  sheet.columns = [
    { key: 'label', width: 32 },
    { key: 'value', width: 24 },
  ];
  sheet.addRow([settings.name]).font = { bold: true, size: 14 };
  sheet.addRow([title]).font = { bold: true, size: 12 };
  sheet.addRow([`${from} to ${to}`]).font = { italic: true, color: { argb: 'FF888888' } };
  sheet.addRow([]);
  for (const m of metrics) {
    const row = sheet.addRow([m.label, m.value]);
    row.getCell(1).font = { bold: true };
    if (m.numFmt) row.getCell(2).numFmt = m.numFmt;
  }
  return sheet;
}

export async function buildSalesReportWorkbook(
  data: SalesReportData,
  settings: SalonSettingsRow
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.name;
  wb.created = new Date();

  addSummarySheet(wb, 'Sales Report', settings, data.from, data.to, [
    { label: 'Revenue', value: data.summary.revenueInr, numFmt: INR_FMT },
    { label: 'Sales count', value: data.summary.salesCount },
    { label: 'Average ticket', value: data.summary.avgTicketInr, numFmt: INR_FMT },
    { label: 'Discounts given', value: data.summary.discountInr, numFmt: INR_FMT },
    { label: 'Coupon discounts', value: data.summary.couponDiscountInr, numFmt: INR_FMT },
    { label: 'Voided sales', value: data.summary.voidCount },
    { label: 'Voided amount', value: data.summary.voidAmountInr, numFmt: INR_FMT },
  ]);

  addTable(
    wb,
    'Payment Methods',
    [
      { header: 'Method', key: 'method', width: 18 },
      { header: 'Amount', key: 'amountInr', numFmt: INR_FMT },
      { header: 'Count', key: 'count' },
    ],
    data.paymentMethods
  );

  addTable(
    wb,
    'Revenue by Type',
    [
      { header: 'Item type', key: 'itemType', width: 18 },
      { header: 'Revenue', key: 'revenueInr', numFmt: INR_FMT },
      { header: 'Qty', key: 'qty' },
    ],
    data.revenueByType
  );

  addTable(
    wb,
    'Top Items',
    [
      { header: 'Item', key: 'name', width: 32 },
      { header: 'Type', key: 'itemType', width: 14 },
      { header: 'Qty sold', key: 'qty' },
      { header: 'Revenue', key: 'revenueInr', numFmt: INR_FMT },
    ],
    data.topItems
  );

  addTable(
    wb,
    'Daily Revenue',
    [
      { header: 'Date', key: 'day', numFmt: DATE_FMT, width: 16 },
      { header: 'Revenue', key: 'revenueInr', numFmt: INR_FMT },
      { header: 'Sales count', key: 'salesCount' },
    ],
    data.dailyRevenue.map((r) => ({ ...r, day: new Date(`${r.day}T00:00:00`) }))
  );

  addTable(
    wb,
    'Voided Sales',
    [
      { header: 'Date', key: 'date', numFmt: DATETIME_FMT, width: 20 },
      { header: 'Customer', key: 'customerName', width: 24 },
      { header: 'Amount', key: 'amountInr', numFmt: INR_FMT },
      { header: 'Reason', key: 'reason', width: 30 },
    ],
    data.voidSales.map((r) => ({ ...r, date: new Date(r.date), reason: r.reason ?? '—' }))
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildAppointmentsReportWorkbook(
  data: AppointmentsReportData,
  settings: SalonSettingsRow
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.name;
  wb.created = new Date();

  addSummarySheet(wb, 'Appointments Report', settings, data.from, data.to, [
    { label: 'Total appointments', value: data.summary.total },
    { label: 'Completed', value: data.summary.completed },
    { label: 'Cancelled', value: data.summary.cancelled },
    { label: 'No-shows', value: data.summary.noShow },
    { label: 'Pending', value: data.summary.pending },
    { label: 'Confirmed', value: data.summary.confirmed },
    { label: 'In progress', value: data.summary.inProgress },
    { label: 'No-show rate', value: data.summary.noShowRatePct, numFmt: PCT_FMT },
    { label: 'Cancellation rate', value: data.summary.cancellationRatePct, numFmt: PCT_FMT },
    { label: 'Avg. lead time (days)', value: Number(data.summary.avgLeadDays.toFixed(1)) },
  ]);

  addTable(
    wb,
    'Status Breakdown',
    [
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Count', key: 'count' },
    ],
    data.statusBreakdown
  );

  addTable(
    wb,
    'Cancellation Reasons',
    [
      { header: 'Reason', key: 'reason', width: 32 },
      { header: 'Count', key: 'count' },
    ],
    data.cancellationReasons
  );

  addTable(
    wb,
    'By Day of Week',
    [
      { header: 'Day', key: 'day', width: 14 },
      { header: 'Count', key: 'count' },
    ],
    data.byDayOfWeek
  );

  addTable(
    wb,
    'By Hour',
    [
      { header: 'Hour', key: 'hourLabel', width: 14 },
      { header: 'Count', key: 'count' },
    ],
    data.byHour.map((r) => ({ hourLabel: formatTime(`${r.hour}:00:00`), count: r.count }))
  );

  addTable(
    wb,
    'By Staff',
    [
      { header: 'Staff', key: 'staffName', width: 24 },
      { header: 'Total', key: 'total' },
      { header: 'Completed', key: 'completed' },
      { header: 'Cancelled', key: 'cancelled' },
      { header: 'No-show', key: 'noShow' },
    ],
    data.byStaff
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildStaffReportWorkbook(
  data: StaffReportData,
  settings: SalonSettingsRow
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.name;
  wb.created = new Date();

  addSummarySheet(wb, 'Staff Performance Report', settings, data.from, data.to, [
    { label: 'Staff counted', value: data.summary.staffCount },
    { label: 'Total revenue', value: data.summary.totalRevenueInr, numFmt: INR_FMT },
    { label: 'Appointments completed', value: data.summary.totalAppointmentsCompleted },
    {
      label: 'Average rating',
      value: data.summary.avgRating != null ? Number(data.summary.avgRating.toFixed(2)) : '—',
    },
  ]);

  addTable(
    wb,
    'Staff',
    [
      { header: 'Name', key: 'name', width: 22 },
      { header: 'Role', key: 'roleTitle', width: 20 },
      { header: 'Revenue', key: 'revenueInr', numFmt: INR_FMT },
      { header: 'Sales', key: 'salesCount' },
      { header: 'Appointments', key: 'totalAppointments' },
      { header: 'Completed', key: 'completedAppointments' },
      { header: 'Cancelled', key: 'cancelledAppointments' },
      { header: 'No-show', key: 'noShowAppointments' },
      { header: 'No-show rate', key: 'noShowRatePct', numFmt: PCT_FMT },
      { header: 'Avg. rating', key: 'avgRating' },
      { header: 'Reviews', key: 'reviewCount' },
      { header: 'Coupons redeemed', key: 'couponRedemptions' },
    ],
    data.rows.map((r) => ({
      ...r,
      roleTitle: r.roleTitle ?? '—',
      avgRating: r.avgRating ?? '—',
    }))
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}
