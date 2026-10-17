import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildSalesReportWorkbook, buildStaffReportWorkbook } from '@/reports/excel';
import type { SalonSettingsRow } from '@/api/settings/settings.repository';
import type { SalesReportData, StaffReportData } from '@/api/reports/reports.service';

const settings = { name: 'The Beauty Town' } as SalonSettingsRow;

describe('reports/excel', () => {
  it('builds a readable sales workbook with the right sheets and values', async () => {
    const data: SalesReportData = {
      from: '2026-10-01',
      to: '2026-10-17',
      summary: {
        revenueInr: 12345,
        salesCount: 7,
        avgTicketInr: 1763.57,
        discountInr: 200,
        couponDiscountInr: 50,
        voidCount: 1,
        voidAmountInr: 500,
      },
      paymentMethods: [{ method: 'cash', amountInr: 12345, count: 7 }],
      revenueByType: [{ itemType: 'service', revenueInr: 12345, qty: 7 }],
      topItems: [{ name: 'Haircut', itemType: 'service', qty: 3, revenueInr: 1500 }],
      dailyRevenue: [{ day: '2026-10-17', revenueInr: 1000, salesCount: 1 }],
      voidSales: [
        {
          date: '2026-10-17T10:00:00Z',
          customerName: 'Walk-in guest',
          amountInr: 500,
          reason: null,
        },
      ],
    };

    const buffer = await buildSalesReportWorkbook(data, settings);
    expect(buffer.length).toBeGreaterThan(0);
    // .xlsx is a zip — a corrupted/empty workbook wouldn't carry this magic number.
    expect(buffer.subarray(0, 2).toString('hex')).toBe('504b');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheetNames = wb.worksheets.map((s) => s.name);
    expect(sheetNames).toEqual([
      'Summary',
      'Payment Methods',
      'Revenue by Type',
      'Top Items',
      'Daily Revenue',
      'Voided Sales',
    ]);

    const summary = wb.getWorksheet('Summary')!;
    const revenueRow = summary
      .getRows(1, summary.rowCount)!
      .find((r) => r.getCell(1).text === 'Revenue');
    expect(revenueRow?.getCell(2).value).toBe(12345);

    const paymentSheet = wb.getWorksheet('Payment Methods')!;
    expect(paymentSheet.getRow(2).getCell(1).value).toBe('cash');
    expect(paymentSheet.getRow(2).getCell(2).value).toBe(12345);
  });

  it('renders a "no data" placeholder instead of crashing on an empty table', async () => {
    const data: StaffReportData = {
      from: '2026-10-01',
      to: '2026-10-17',
      summary: {
        staffCount: 0,
        totalRevenueInr: 0,
        totalAppointmentsCompleted: 0,
        avgRating: null,
      },
      rows: [],
    };

    const buffer = await buildStaffReportWorkbook(data, settings);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    const staffSheet = wb.getWorksheet('Staff')!;
    expect(staffSheet.getRow(2).getCell(1).text).toContain('No data');
  });
});
