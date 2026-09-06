import { Document } from '@react-pdf/renderer';
import type { SalonSettingsRow } from '@/api/settings/settings.repository';
import type { SalesReportData } from '@/api/reports/reports.service';
import ReportPage from './ReportLayout';
import { DataTable, KpiBand, Section, type ReportColumn } from './components';
import { formatDate, formatInr } from './format';

const ITEM_TYPE_LABEL: Record<string, string> = {
  service: 'Services',
  product: 'Products',
  package: 'Packages',
};

function SalesReportDocument({
  data,
  settings,
}: {
  data: SalesReportData;
  settings: SalonSettingsRow;
}) {
  const { summary } = data;
  const netDiscount = summary.discountInr + summary.couponDiscountInr;

  const paymentColumns: ReportColumn<SalesReportData['paymentMethods'][number]>[] = [
    { header: 'Method', width: '40%', render: (r) => r.method.toUpperCase() },
    { header: 'Transactions', width: '30%', align: 'right', render: (r) => String(r.count) },
    { header: 'Amount', width: '30%', align: 'right', render: (r) => formatInr(r.amountInr) },
  ];

  const typeColumns: ReportColumn<SalesReportData['revenueByType'][number]>[] = [
    {
      header: 'Category',
      width: '40%',
      render: (r) => ITEM_TYPE_LABEL[r.itemType] ?? r.itemType,
    },
    { header: 'Qty sold', width: '30%', align: 'right', render: (r) => String(r.qty) },
    { header: 'Revenue', width: '30%', align: 'right', render: (r) => formatInr(r.revenueInr) },
  ];

  const topItemColumns: ReportColumn<SalesReportData['topItems'][number]>[] = [
    { header: 'Item', width: '40%', render: (r) => r.name },
    {
      header: 'Type',
      width: '18%',
      render: (r) => ITEM_TYPE_LABEL[r.itemType] ?? r.itemType,
    },
    { header: 'Qty', width: '14%', align: 'right', render: (r) => String(r.qty) },
    { header: 'Revenue', width: '28%', align: 'right', render: (r) => formatInr(r.revenueInr) },
  ];

  const dailyColumns: ReportColumn<SalesReportData['dailyRevenue'][number]>[] = [
    { header: 'Date', width: '40%', render: (r) => formatDate(r.day) },
    { header: 'Bills', width: '30%', align: 'right', render: (r) => String(r.salesCount) },
    { header: 'Revenue', width: '30%', align: 'right', render: (r) => formatInr(r.revenueInr) },
  ];

  const voidColumns: ReportColumn<SalesReportData['voidSales'][number]>[] = [
    { header: 'Date', width: '22%', render: (r) => formatDate(r.date.slice(0, 10)) },
    { header: 'Customer', width: '33%', render: (r) => r.customerName },
    { header: 'Amount', width: '20%', align: 'right', render: (r) => formatInr(r.amountInr) },
    { header: 'Reason', width: '25%', render: (r) => r.reason ?? '—' },
  ];

  return (
    <Document
      title={`Sales Report — ${settings.name}`}
      author={settings.name}
      subject={`Sales report from ${data.from} to ${data.to}`}
    >
      <ReportPage settings={settings} title="Sales Report" from={data.from} to={data.to}>
        <KpiBand
          items={[
            { label: 'Revenue', value: formatInr(summary.revenueInr) },
            { label: 'Bills', value: String(summary.salesCount) },
            { label: 'Avg. Ticket', value: formatInr(summary.avgTicketInr) },
            { label: 'Discounts Given', value: formatInr(netDiscount) },
            {
              label: 'Voided',
              value: `${summary.voidCount} (${formatInr(summary.voidAmountInr)})`,
            },
          ]}
        />

        <Section title="Revenue by Category">
          <DataTable columns={typeColumns} rows={data.revenueByType} />
        </Section>

        <Section title="Payment Methods">
          <DataTable columns={paymentColumns} rows={data.paymentMethods} />
        </Section>

        <Section title="Top 15 Best-Selling Items">
          <DataTable columns={topItemColumns} rows={data.topItems} />
        </Section>

        <Section title="Daily Revenue">
          <DataTable
            columns={dailyColumns}
            rows={data.dailyRevenue}
            emptyMessage="No completed sales in this period."
          />
        </Section>

        {data.voidSales.length > 0 && (
          <Section title="Voided Sales">
            <DataTable columns={voidColumns} rows={data.voidSales} />
          </Section>
        )}
      </ReportPage>
    </Document>
  );
}

export default SalesReportDocument;
