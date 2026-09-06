import { Document } from '@react-pdf/renderer';
import type { SalonSettingsRow } from '@/api/settings/settings.repository';
import type { StaffReportData } from '@/api/reports/reports.service';
import ReportPage from './ReportLayout';
import { DataTable, KpiBand, Section, type ReportColumn } from './components';
import { formatInr, formatPct } from './format';

function StaffReportDocument({
  data,
  settings,
}: {
  data: StaffReportData;
  settings: SalonSettingsRow;
}) {
  const { summary } = data;

  const columns: ReportColumn<StaffReportData['rows'][number]>[] = [
    { header: 'Stylist', width: '20%', render: (r) => r.name },
    { header: 'Role', width: '14%', render: (r) => r.roleTitle ?? '—' },
    { header: 'Revenue', width: '14%', align: 'right', render: (r) => formatInr(r.revenueInr) },
    { header: 'Bills', width: '9%', align: 'right', render: (r) => String(r.salesCount) },
    {
      header: 'Appts Done',
      width: '11%',
      align: 'right',
      render: (r) => String(r.completedAppointments),
    },
    {
      header: 'No-show %',
      width: '11%',
      align: 'right',
      render: (r) => formatPct(r.noShowRatePct),
    },
    {
      header: 'Rating',
      width: '10%',
      align: 'right',
      render: (r) => (r.avgRating != null ? `${r.avgRating.toFixed(1)} ★ (${r.reviewCount})` : '—'),
    },
    {
      header: 'Coupons',
      width: '11%',
      align: 'right',
      render: (r) => String(r.couponRedemptions),
    },
  ];

  return (
    <Document
      title={`Staff Performance Report — ${settings.name}`}
      author={settings.name}
      subject={`Staff performance report from ${data.from} to ${data.to}`}
    >
      <ReportPage
        settings={settings}
        title="Staff Performance Report"
        from={data.from}
        to={data.to}
      >
        <KpiBand
          items={[
            { label: 'Active Staff', value: String(summary.staffCount) },
            { label: 'Combined Revenue', value: formatInr(summary.totalRevenueInr) },
            { label: 'Appointments Done', value: String(summary.totalAppointmentsCompleted) },
            {
              label: 'Avg. Rating',
              value: summary.avgRating != null ? `${summary.avgRating.toFixed(1)} ★` : '—',
            },
          ]}
        />

        <Section title="Performance by Stylist">
          <DataTable
            columns={columns}
            rows={data.rows}
            emptyMessage="No active staff members found."
          />
        </Section>
      </ReportPage>
    </Document>
  );
}

export default StaffReportDocument;
