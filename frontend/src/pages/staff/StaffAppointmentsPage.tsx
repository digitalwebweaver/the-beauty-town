import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight, CalendarDays, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/common/PageHeader';
import AppointmentCalendar from '@/components/common/AppointmentCalendar';
import TransferDialog, { type TransferTarget } from '@/components/common/TransferDialog';
import { apiError } from '@/lib/apiError';
import { STATUS_STYLES } from '@/lib/appointmentStatus';
import { formatDate, formatTime } from '@/lib/formatDate';
import { cn } from '@/lib/utils';
import {
  useAllAppointments,
  useUpdateAppointmentStatus,
  type AppointmentListItem,
  type AppointmentStatus,
} from '@/services/appointments.api';

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
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">{a.customer_name}</p>
          <p className="text-xs text-muted-foreground">{a.customer_phone}</p>
          <p className="mt-2 text-sm">
            {a.service_names.join(' + ')} · {formatDate(a.appointment_date)} at{' '}
            {formatTime(a.start_time)}
            {a.staff_name ? ` · ${a.staff_name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={a.status}
            onValueChange={(v) => onUpdateStatus(a.id, v as AppointmentStatus)}
          >
            <SelectTrigger
              className={cn('w-40 border-transparent font-medium', STATUS_STYLES[a.status])}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="no_show">No-show</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {['pending', 'confirmed'].includes(a.status) && (
            <Button
              variant="outline"
              size="sm"
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
              <ArrowLeftRight className="mr-1 h-4 w-4" /> Transfer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StaffAppointmentsPage() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useAllAppointments({ q: q || undefined });
  const updateMut = useUpdateAppointmentStatus();
  const [toTransfer, setToTransfer] = useState<TransferTarget | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const list = data ?? [];
  const upcoming = list.filter((a) => ['pending', 'confirmed', 'in_progress'].includes(a.status));
  const past = list.filter((a) => ['completed', 'cancelled', 'no_show'].includes(a.status));

  const update = async (id: string, s: AppointmentStatus) => {
    try {
      await updateMut.mutateAsync({ id, status: s });
      toast.success('Status updated');
    } catch (err) {
      toast.error(apiError(err, 'Update failed'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="All salon appointments — mark check-ins, completions, and no-shows."
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

      {view === 'list' && (
        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer or stylist…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : view === 'calendar' ? (
        <AppointmentCalendar
          appointments={list}
          renderAppointment={(a) => (
            <AppointmentRow key={a.id} a={a} onUpdateStatus={update} onTransfer={setToTransfer} />
          )}
        />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>

          {[
            { value: 'upcoming', rows: upcoming },
            { value: 'past', rows: past },
          ].map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-3">
              {tab.rows.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center text-sm text-muted-foreground">
                    Nothing here yet.
                  </CardContent>
                </Card>
              ) : (
                tab.rows.map((a) => (
                  <AppointmentRow
                    key={a.id}
                    a={a}
                    onUpdateStatus={update}
                    onTransfer={setToTransfer}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <TransferDialog appointment={toTransfer} onClose={() => setToTransfer(null)} />
    </div>
  );
}

export default StaffAppointmentsPage;
