import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import { formatTime } from '@/lib/formatDate';
import { ROUTES } from '@/constants/routes';
import { useAllAppointments } from '@/services/appointments.api';
import { useAuth } from '@/hooks/useAuth';

function StaffDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAllAppointments();

  const list = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todays = list.filter((a) => a.appointment_date === today);
  const upcoming = list.filter((a) => ['pending', 'confirmed', 'in_progress'].includes(a.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hey ${user?.name?.split(' ')[0] ?? 'there'} 👋`}
        description="Every appointment in the salon at a glance."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Appointments today" value={String(todays.length)} icon={CalendarCheck} />
        <StatCard label="Upcoming" value={String(upcoming.length)} icon={Clock} />
        <StatCard
          label="Total customers today"
          value={String(new Set(todays.map((a) => a.customer_name)).size)}
          icon={Users}
        />
        <StatCard
          label="Completed (all-time)"
          value={String(list.filter((a) => a.status === 'completed').length)}
          icon={CalendarCheck}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Today&apos;s appointments</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to={ROUTES.staffAppointments}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <Skeleton className="h-24 rounded-lg" />}
          {!isLoading && todays.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No appointments today.
            </div>
          ) : (
            todays.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{a.customer_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.service_names.join(' + ')} · {formatTime(a.start_time)} · {a.staff_name}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StaffDashboardPage;
