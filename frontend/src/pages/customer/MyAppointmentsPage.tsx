import { useState } from 'react';
import { CalendarDays, Clock, List, User } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import AppointmentCalendar from '@/components/common/AppointmentCalendar';
import SectionError from '@/components/common/SectionError';
import { formatDate, formatTime } from '@/lib/formatDate';
import {
  useCancelAppointment,
  useMyAppointments,
  type AppointmentListItem,
} from '@/services/appointments.api';

function apiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}

function AppointmentCard({
  a,
  onCancel,
}: {
  a: AppointmentListItem;
  onCancel?: (a: AppointmentListItem) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold">{a.service_names.join(' + ')}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> {formatDate(a.appointment_date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatTime(a.start_time)} – {formatTime(a.end_time)}
            </span>
            {a.staff_name && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" /> {a.staff_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={a.status} />
          <p className="font-semibold">₹{Number(a.total_inr).toLocaleString('en-IN')}</p>
          {onCancel && ['pending', 'confirmed'].includes(a.status) && (
            <Button variant="outline" size="sm" onClick={() => onCancel(a)}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MyAppointmentsPage() {
  const { data, isLoading, isError, refetch } = useMyAppointments();
  const cancelMut = useCancelAppointment();
  const [toCancel, setToCancel] = useState<AppointmentListItem | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const all = data ?? [];
  const upcoming = all.filter((a) => ['pending', 'confirmed', 'in_progress'].includes(a.status));
  const past = all.filter((a) => a.status === 'completed');
  const cancelled = all.filter((a) => ['cancelled', 'no_show'].includes(a.status));

  const confirmCancel = async () => {
    if (!toCancel) return;
    try {
      await cancelMut.mutateAsync({ id: toCancel.id });
      toast.success('Appointment cancelled');
      setToCancel(null);
    } catch (err) {
      toast.error(apiError(err, 'Cancel failed'));
    }
  };

  return (
    <div>
      <PageHeader
        title="My Appointments"
        description="View, reschedule, or cancel your bookings."
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionError
          className="py-16"
          message="Couldn't load your appointments right now."
          onRetry={() => refetch()}
        />
      ) : view === 'calendar' ? (
        <AppointmentCalendar
          appointments={all}
          renderAppointment={(a) => <AppointmentCard key={a.id} a={a} onCancel={setToCancel} />}
        />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3">
            {upcoming.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No upcoming appointments.
                </CardContent>
              </Card>
            ) : (
              upcoming.map((a) => <AppointmentCard key={a.id} a={a} onCancel={setToCancel} />)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3">
            {past.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No past appointments yet.
                </CardContent>
              </Card>
            ) : (
              past.map((a) => <AppointmentCard key={a.id} a={a} />)
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-3">
            {cancelled.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No cancelled appointments.
                </CardContent>
              </Card>
            ) : (
              cancelled.map((a) => <AppointmentCard key={a.id} a={a} />)
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!toCancel} onOpenChange={(o) => !o && setToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel appointment?</DialogTitle>
            <DialogDescription>
              Cancelling {toCancel?.service_names.join(' + ')} on{' '}
              {formatDate(toCancel?.appointment_date)} at {formatTime(toCancel?.start_time)}. This
              action can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToCancel(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelMut.isPending}>
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MyAppointmentsPage;
