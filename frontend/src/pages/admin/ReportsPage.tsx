import { useState } from 'react';
import { toast } from 'sonner';
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { CalendarCheck, Check, FileBarChart, Loader2, ReceiptText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { apiError } from '@/lib/apiError';
import { useDownloadReport, type ReportType } from '@/services/reports.api';

const REPORTS: {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    type: 'sales',
    title: 'Sales Report',
    description: 'Revenue, payment methods, best-sellers, and voided bills.',
    icon: ReceiptText,
  },
  {
    type: 'appointments',
    title: 'Appointments Report',
    description: 'Booking volume, cancellations, no-shows, and demand patterns.',
    icon: CalendarCheck,
  },
  {
    type: 'staff',
    title: 'Staff Performance Report',
    description: 'Revenue, appointments, ratings, and coupon activity per stylist.',
    icon: Users,
  },
];

const toIso = (d: Date) => format(d, 'yyyy-MM-dd');
const today = new Date();

const PRESETS: { label: string; from: Date; to: Date }[] = [
  { label: 'Last 7 days', from: subDays(today, 6), to: today },
  { label: 'Last 30 days', from: subDays(today, 29), to: today },
  { label: 'This month', from: startOfMonth(today), to: today },
  {
    label: 'Last month',
    from: startOfMonth(subMonths(today, 1)),
    to: endOfMonth(subMonths(today, 1)),
  },
  { label: 'This year', from: startOfYear(today), to: today },
];

function ReportsPage() {
  const [type, setType] = useState<ReportType>('sales');
  const [from, setFrom] = useState(toIso(subDays(today, 29)));
  const [to, setTo] = useState(toIso(today));
  const download = useDownloadReport();

  const handleDownload = async () => {
    if (!from || !to) return toast.error('Pick a start and end date');
    if (from > to) return toast.error('"From" must be before "to"');
    try {
      await download.mutateAsync({ type, from, to });
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(apiError(err, 'Could not generate the report'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Download branded, printable PDF reports for any date range."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const selected = type === r.type;
          return (
            <button
              key={r.type}
              type="button"
              onClick={() => setType(r.type)}
              className="text-left"
            >
              <Card
                className={cn(
                  'h-full transition-colors',
                  selected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40'
                )}
              >
                <CardContent className="flex items-start gap-3 p-5">
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{r.title}</p>
                      {selected && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardContent className="p-6">
          <p className="mb-4 font-semibold">Date range</p>

          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFrom(toIso(p.from));
                  setTo(toIso(p.to));
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="report-from">From</Label>
              <Input
                id="report-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full sm:w-44"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-to">To</Label>
              <Input
                id="report-to"
                type="date"
                value={to}
                min={from || undefined}
                max={toIso(today)}
                onChange={(e) => setTo(e.target.value)}
                className="w-full sm:w-44"
              />
            </div>
            <Button onClick={handleDownload} disabled={download.isPending} className="sm:ml-auto">
              {download.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileBarChart className="mr-2 h-4 w-4" />
              )}
              {download.isPending ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReportsPage;
