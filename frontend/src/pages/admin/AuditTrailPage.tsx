import { useState } from 'react';
import { endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns';
import { Activity, KeyRound, Search, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/common/PageHeader';
import EmptyTableRow from '@/components/common/EmptyTableRow';
import SectionError from '@/components/common/SectionError';
import Pagination from '@/components/common/Pagination';
import StatCard from '@/components/common/StatCard';
import { SimpleBarChart } from '@/components/admin/AnalyticsCharts';
import { CHART_COLORS } from '@/lib/chartColors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuditLogs, useAuditStats } from '@/services/audit.api';

const PAGE_SIZE = 25;
const ALL = '__all__';

const MODULES: { label: string; value: string }[] = [
  { label: 'Auth (logins)', value: 'auth' },
  { label: 'Appointments', value: 'appointments' },
  { label: 'Sales', value: 'sales' },
  { label: 'Staff', value: 'staff' },
  { label: 'Settings', value: 'settings' },
  { label: 'Coupons', value: 'coupons' },
  { label: 'Services', value: 'services' },
  { label: 'Packages', value: 'packages' },
  { label: 'Products', value: 'products' },
  { label: 'Users / Customers', value: 'users' },
];

const toIso = (d: Date) => format(d, 'yyyy-MM-dd');
const today = new Date();

const PRESETS: { label: string; from: Date; to: Date }[] = [
  { label: 'Today', from: today, to: today },
  { label: 'Last 7 days', from: subDays(today, 6), to: today },
  { label: 'Last 30 days', from: subDays(today, 29), to: today },
  { label: 'This month', from: startOfMonth(today), to: today },
  {
    label: 'Last month',
    from: startOfMonth(subMonths(today, 1)),
    to: endOfMonth(subMonths(today, 1)),
  },
];

function formatTimestamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** "auth.login" -> "Auth · login", "settings:PATCH /" -> "Settings · PATCH /" —
 * readable either for a semantically-enriched action or the generic
 * method+path fallback the audit middleware writes when nothing enriched it. */
function formatAction(action: string): { module: string; rest: string } {
  const sep = action.includes(':') ? ':' : action.includes('.') ? '.' : null;
  if (!sep) return { module: action, rest: '' };
  const idx = action.indexOf(sep);
  const module = action.slice(0, idx);
  const rest = action.slice(idx + 1);
  return { module: module.charAt(0).toUpperCase() + module.slice(1), rest };
}

function StatusBadge({ code }: { code: number | null }) {
  if (code == null) return <span className="text-muted-foreground">—</span>;
  const ok = code < 400;
  return (
    <Badge variant="outline" className={ok ? 'text-emerald-700' : 'text-destructive'}>
      {code}
    </Badge>
  );
}

function AuditTrailPage() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const [module, setModule] = useState(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const stats = useAuditStats(30);

  const filterKey = `${debouncedQ}|${module}|${from}|${to}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  const logs = useAuditLogs({
    q: debouncedQ || undefined,
    action: module === ALL ? undefined : module,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = logs.data?.data ?? [];
  const todayCount = stats.data?.dailyActivity.at(-1)?.count ?? 0;
  const busiestAction = stats.data?.topActions[0];

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="Who did what, when — every login and every change made inside the system."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Actions Today" value={String(todayCount)} icon={Activity} />
        <StatCard
          label="Active Sessions"
          value={String(stats.data?.activeSessionCount ?? '—')}
          icon={Users}
        />
        <StatCard
          label="Login Failures (30d)"
          value={String(stats.data?.loginFailureCount ?? '—')}
          icon={KeyRound}
        />
        <StatCard
          label="Busiest Action (30d)"
          value={busiestAction ? String(busiestAction.count) : '—'}
          delta={busiestAction ? formatAction(busiestAction.action).module : undefined}
          trend="flat"
        />
      </div>

      <Card className="mt-4">
        <CardContent className="p-6">
          <p className="mb-4 font-semibold">Activity over the last 30 days</p>
          {stats.isLoading ? (
            <Skeleton className="h-[200px] rounded-lg" />
          ) : (
            <SimpleBarChart
              data={stats.data?.dailyActivity ?? []}
              xKey="day"
              color={CHART_COLORS[0]}
              name="Actions"
            />
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by actor, action, or path…"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All modules</SelectItem>
                  {MODULES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="w-full sm:w-40"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                title="From date"
              />
              <Input
                type="date"
                className="w-full sm:w-40"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                title="To date"
              />
            </div>
          </div>

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

          {logs.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : logs.isError ? (
            <SectionError
              message="Couldn't load the audit trail right now."
              onRetry={() => logs.refetch()}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <EmptyTableRow
                        colSpan={6}
                        message={
                          q || module !== ALL || from || to
                            ? 'No activity matches your filters.'
                            : 'No activity recorded yet.'
                        }
                      />
                    )}
                    {rows.map((r) => {
                      const { date, time } = formatTimestamp(r.created_at);
                      const { module: modLabel, rest } = formatAction(r.action);
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <p>{date}</p>
                            <p className="text-xs text-muted-foreground">{time}</p>
                          </TableCell>
                          <TableCell>
                            {r.actor_name || r.actor_email ? (
                              <>
                                <p className="font-medium">{r.actor_name ?? r.actor_email}</p>
                                {r.actor_role && (
                                  <p className="text-xs capitalize text-muted-foreground">
                                    {r.actor_role}
                                  </p>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Anonymous</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <p className="font-medium">{modLabel}</p>
                            {rest && (
                              <p className="truncate text-xs text-muted-foreground" title={rest}>
                                {rest}
                              </p>
                            )}
                            {r.meta && Object.keys(r.meta).length > 0 && (
                              <p
                                className="truncate text-xs text-muted-foreground"
                                title={JSON.stringify(r.meta)}
                              >
                                {JSON.stringify(r.meta)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.target_type ? `${r.target_type}` : '—'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge code={r.status_code} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.ip_address ?? '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                page={page}
                pageSize={PAGE_SIZE}
                total={logs.data?.total ?? 0}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AuditTrailPage;
