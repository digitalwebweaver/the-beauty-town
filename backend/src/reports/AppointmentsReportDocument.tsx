import { Document } from '@react-pdf/renderer';
import type { SalonSettingsRow } from '@/api/settings/settings.repository';
import type { AppointmentsReportData } from '@/api/reports/reports.service';
import ReportPage from './ReportLayout';
import { DataTable, KpiBand, Section, type ReportColumn } from './components';
import { formatPct, formatTime } from './format';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

function AppointmentsReportDocument({
  data,
  settings,
}: {
  data: AppointmentsReportData;
  settings: SalonSettingsRow;
}) {
  const { summary } = data;

  const statusColumns: ReportColumn<AppointmentsReportData['statusBreakdown'][number]>[] = [
    { header: 'Status', width: '60%', render: (r) => STATUS_LABEL[r.status] ?? r.status },
    { header: 'Count', width: '40%', align: 'right', render: (r) => String(r.count) },
  ];

  const reasonColumns: ReportColumn<AppointmentsReportData['cancellationReasons'][number]>[] = [
    { header: 'Reason', width: '70%', render: (r) => r.reason },
    { header: 'Count', width: '30%', align: 'right', render: (r) => String(r.count) },
  ];

  const dowColumns: ReportColumn<AppointmentsReportData['byDayOfWeek'][number]>[] = [
    { header: 'Day', width: '60%', render: (r) => r.day },
    { header: 'Bookings', width: '40%', align: 'right', render: (r) => String(r.count) },
  ];

  const hourColumns: ReportColumn<AppointmentsReportData['byHour'][number]>[] = [
    { header: 'Time slot', width: '60%', render: (r) => formatTime(`${r.hour}:00`) },
    { header: 'Bookings', width: '40%', align: 'right', render: (r) => String(r.count) },
  ];

  const staffColumns: ReportColumn<AppointmentsReportData['byStaff'][number]>[] = [
    { header: 'Stylist', width: '32%', render: (r) => r.staffName },
    { header: 'Total', width: '17%', align: 'right', render: (r) => String(r.total) },
    { header: 'Completed', width: '17%', align: 'right', render: (r) => String(r.completed) },
    { header: 'Cancelled', width: '17%', align: 'right', render: (r) => String(r.cancelled) },
    { header: 'No-show', width: '17%', align: 'right', render: (r) => String(r.noShow) },
  ];

  return (
    <Document
      title={`Appointments Report — ${settings.name}`}
      author={settings.name}
      subject={`Appointments report from ${data.from} to ${data.to}`}
    >
      <ReportPage settings={settings} title="Appointments Report" from={data.from} to={data.to}>
        <KpiBand
          items={[
            { label: 'Total Bookings', value: String(summary.total) },
            { label: 'Completed', value: String(summary.completed) },
            { label: 'No-show Rate', value: formatPct(summary.noShowRatePct) },
            { label: 'Cancellation Rate', value: formatPct(summary.cancellationRatePct) },
            { label: 'Avg. Lead Time', value: `${summary.avgLeadDays.toFixed(1)} days` },
          ]}
        />

        <Section title="Status Breakdown">
          <DataTable columns={statusColumns} rows={data.statusBreakdown} />
        </Section>

        <Section title="Cancellation Reasons">
          <DataTable
            columns={reasonColumns}
            rows={data.cancellationReasons}
            emptyMessage="No cancellations in this period."
          />
        </Section>

        <Section title="Demand by Day of Week">
          <DataTable columns={dowColumns} rows={data.byDayOfWeek} />
        </Section>

        <Section title="Demand by Time Slot">
          <DataTable columns={hourColumns} rows={data.byHour} />
        </Section>

        <Section title="Bookings by Stylist">
          <DataTable columns={staffColumns} rows={data.byStaff} />
        </Section>
      </ReportPage>
    </Document>
  );
}

export default AppointmentsReportDocument;
