import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight, CalendarDays, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import AppointmentCalendar from '@/components/common/AppointmentCalendar';
import TransferDialog, { type TransferTarget } from '@/components/common/TransferDialog';
import SectionError from '@/components/common/SectionError';
import Pagination from '@/components/common/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiError } from '@/lib/apiError';
import { STATUS_STYLES } from '@/lib/appointmentStatus';
import { formatDate, formatTime } from '@/lib/formatDate';
import { cn } from '@/lib/utils';
import {
  useAllAppointments,
  useAllAppointmentsPaged,
  useUpdateAppointmentStatus,
  type AppointmentListItem,
  type AppointmentStatus,
} from '@/services/appointments.api';

const PAGE_SIZE = 20;

const STATUSES: (AppointmentStatus | 'all')[] = [
  'all',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

function AppointmentRow({
  a,
  onUpdateStatus,
  onTransfer,
}: {
  a: AppointmentListItem;
  onUpdateStatus: (id: string, s: AppointmentStatus) => void;
  onTransfer: (target: TransferTarget) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="font-semibold">{a.customer_name}</p>
          <p className="text-xs text-muted-foreground">{a.customer_phone}</p>
        </div>
        <p className="text-sm">
          {a.service_names.join(' + ')} · {formatTime(a.start_time)}
          {a.staff_name ? ` · ${a.staff_name}` : ''}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={a.status}
            onValueChange={(v) => onUpdateStatus(a.id, v as AppointmentStatus)}
          >
            <SelectTrigger
              className={cn('w-36 border-transparent font-medium', STATUS_STYLES[a.status])}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.filter((s) => s !== 'all').map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {['pending', 'confirmed'].includes(a.status) && (
            <Button
              size="sm"
              variant="outline"
              title="Transfer to another stylist"
              onClick={() =>
                onTransfer({
                  id: a.id,
                  customer_name: a.customer_name,
                  appointment_date: a.appointment_date,
                  start_time: a.start_time,
                  end_time: a.end_time,
                  service_names: a.service_names,
                  staff_name: a.staff_name,
                })
              }
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentsManagementPage() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const [status, setStatus] = useState<'all' | AppointmentStatus>('all');
  const [toTransfer, setToTransfer] = useState<TransferTarget | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the filters actually change, same pattern as
  // ServicesManagementPage/CustomersPage.
  const filterKey = `${debouncedQ}|${status}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    setPage(1);
  }

  // Calendar view wants EVERY appointment matching the filters (it lays
  // them out by date, not by page) — the list view is the one that's
  // genuinely paginated. Only the active view's query is enabled, so
  // switching tabs doesn't fetch both up front.
  const calendarQuery = useAllAppointments({
    status: status === 'all' ? undefined : status,
    q: debouncedQ || undefined,
    enabled: view === 'calendar',
  });
  const listQuery = useAllAppointmentsPaged({
    status: status === 'all' ? undefined : status,
    q: debouncedQ || undefined,
    page,
    pageSize: PAGE_SIZE,
    enabled: view === 'list',
  });
  const { data, isLoading, isError, refetch } =
    view === 'calendar'
      ? {
          data: calendarQuery.data,
          isLoading: calendarQuery.isLoading,
          isError: calendarQuery.isError,
          refetch: calendarQuery.refetch,
        }
      : {
          data: listQuery.data?.data,
          isLoading: listQuery.isLoading,
          isError: listQuery.isError,
          refetch: listQuery.refetch,
        };
  const updateMut = useUpdateAppointmentStatus();

  const changeStatus = async (id: string, s: AppointmentStatus) => {
    try {
      await updateMut.mutateAsync({ id, status: s });
      toast.success(`Marked as ${s.replace('_', ' ')}`);
    } catch (err) {
      toast.error(apiError(err, 'Update failed'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Track, confirm, and update all salon appointments."
        actions={
          <div className="inline-flex rounded-lg border p-1">
            <Button
              type="button"
              size="sm"
              variant={view === 'list' ? 'default' : 'ghost'}
              onClick={() => setView('list')}
            >
              <List className="mr-1.5 h-3.5 w-3.5" /> List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setView('calendar')}
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Calendar
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionError message="Couldn't load appointments right now." onRetry={() => refetch()} />
      ) : view === 'calendar' ? (
        <AppointmentCalendar
          appointments={data ?? []}
          renderAppointment={(a) => (
            <AppointmentRow
              key={a.id}
              a={a}
              onUpdateStatus={changeStatus}
              onTransfer={setToTransfer}
            />
          )}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by customer or stylist…"
                  className="pl-9"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as 'all' | AppointmentStatus)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Below sm: the same cards used in the calendar view — a
                7-column table would force heavy horizontal scrolling on a
                phone for what's this page's default view. */}
            <div className="space-y-2 sm:hidden">
              {data?.map((a) => (
                <AppointmentRow
                  key={a.id}
                  a={a}
                  onUpdateStatus={changeStatus}
                  onTransfer={setToTransfer}
                />
              ))}
            </div>

            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Stylist</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium">{a.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{a.customer_phone}</p>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate">{a.service_names.join(' + ')}</p>
                    </TableCell>
                    <TableCell>{a.staff_name ?? '—'}</TableCell>
                    <TableCell>
                      <p>{formatDate(a.appointment_date)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(a.start_time)}</p>
                    </TableCell>
                    <TableCell>₹{Number(a.total_inr).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Select
                        value={a.status}
                        onValueChange={(v) => changeStatus(a.id, v as AppointmentStatus)}
                      >
                        <SelectTrigger
                          className={cn(
                            'w-36 border-transparent font-medium',
                            STATUS_STYLES[a.status]
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.filter((s) => s !== 'all').map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {['pending', 'confirmed'].includes(a.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Transfer to another stylist"
                          onClick={() =>
                            setToTransfer({
                              id: a.id,
                              customer_name: a.customer_name,
                              appointment_date: a.appointment_date,
                              start_time: a.start_time,
                              end_time: a.end_time,
                              service_names: a.service_names,
                              staff_name: a.staff_name,
                            })
                          }
                        >
                          <ArrowLeftRight className="mr-1.5 h-4 w-4" /> Transfer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              className="mt-4"
              page={page}
              pageSize={PAGE_SIZE}
              total={listQuery.data?.total ?? 0}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      )}

      <TransferDialog appointment={toTransfer} onClose={() => setToTransfer(null)} />
    </div>
  );
}

export default AppointmentsManagementPage;
