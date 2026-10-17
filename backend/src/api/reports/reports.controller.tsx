import { renderToBuffer } from '@react-pdf/renderer';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { getSettings } from '@/api/settings/settings.repository';
import SalesReportDocument from '@/reports/SalesReportDocument';
import AppointmentsReportDocument from '@/reports/AppointmentsReportDocument';
import StaffReportDocument from '@/reports/StaffReportDocument';
import {
  buildAppointmentsReportWorkbook,
  buildSalesReportWorkbook,
  buildStaffReportWorkbook,
} from '@/reports/excel';
import {
  buildAppointmentsReportData,
  buildSalesReportData,
  buildStaffReportData,
} from './reports.service';

type ReportType = 'sales' | 'appointments' | 'staff';
type ReportFormat = 'pdf' | 'xlsx';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const getReport = asyncHandler(async (req, res) => {
  const { type } = req.params as { type: ReportType };
  const { from, to, format } = req.query as unknown as {
    from: string;
    to: string;
    format: ReportFormat;
  };

  const settings = await getSettings();

  let buffer: Buffer;
  if (format === 'xlsx') {
    switch (type) {
      case 'sales':
        buffer = await buildSalesReportWorkbook(await buildSalesReportData(from, to), settings);
        break;
      case 'appointments':
        buffer = await buildAppointmentsReportWorkbook(
          await buildAppointmentsReportData(from, to),
          settings
        );
        break;
      case 'staff':
        buffer = await buildStaffReportWorkbook(await buildStaffReportData(from, to), settings);
        break;
      default:
        // Unreachable — reports.validator.ts's zod enum already rejects
        // anything else before this handler runs. Kept as a safety net.
        throw ApiError.badRequest(`Unknown report type: ${type}`);
    }
  } else {
    switch (type) {
      case 'sales': {
        const data = await buildSalesReportData(from, to);
        buffer = await renderToBuffer(<SalesReportDocument data={data} settings={settings} />);
        break;
      }
      case 'appointments': {
        const data = await buildAppointmentsReportData(from, to);
        buffer = await renderToBuffer(
          <AppointmentsReportDocument data={data} settings={settings} />
        );
        break;
      }
      case 'staff': {
        const data = await buildStaffReportData(from, to);
        buffer = await renderToBuffer(<StaffReportDocument data={data} settings={settings} />);
        break;
      }
      default:
        throw ApiError.badRequest(`Unknown report type: ${type}`);
    }
  }

  const filename = `${type}-report_${from}_to_${to}.${format}`;
  res.setHeader('Content-Type', format === 'xlsx' ? XLSX_CONTENT_TYPE : 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
});
