import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Heart,
  ScissorsSquare,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import SectionError from '@/components/common/SectionError';
import { formatDate, formatTime } from '@/lib/formatDate';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { imageUrl } from '@/lib/imageUrl';
import { useMyAppointments } from '@/services/appointments.api';
import { useStaff } from '@/services/staff.api';
import { useServices } from '@/services/services.api';

function CustomerDashboardPage() {
  const { user } = useAuth();
  const appts = useMyAppointments();
  const staff = useStaff();
  const services = useServices();

  const my = appts.data ?? [];
  const upcoming = my.filter((a) => ['pending', 'confirmed'].includes(a.status));
  const past = my.filter((a) => a.status === 'completed');
  const totalSpent = my.reduce((s, a) => s + Number(a.total_inr), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'} 👋`}
        description="Here's what's happening with your bookings."
        actions={
          <Button asChild>
            <Link to={ROUTES.book}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Book Appointment
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Upcoming" value={String(upcoming.length)} icon={CalendarCheck} />
        <StatCard label="Completed" value={String(past.length)} icon={ScissorsSquare} />
        <StatCard
          label="Total spent"
          value={`₹${totalSpent.toLocaleString('en-IN')}`}
          icon={Wallet}
        />
        <StatCard label="Loyalty points" value={String(past.length * 100)} icon={Heart} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming appointments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.myAppointments}>
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {appts.isLoading ? (
              <Skeleton className="h-20 rounded-lg" />
            ) : appts.isError ? (
              <SectionError
                message="Couldn't load your appointments."
                onRetry={() => appts.refetch()}
              />
            ) : upcoming.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No upcoming appointments.{' '}
                <Link to={ROUTES.book} className="text-primary hover:underline">
                  Book one now
                </Link>
                .
              </div>
            ) : (
              upcoming.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{a.service_names.join(' + ')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      with {a.staff_name ?? 'any stylist'} · {formatDate(a.appointment_date)} at{' '}
                      {formatTime(a.start_time)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={a.status} />
                    <p className="font-semibold">₹{Number(a.total_inr).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meet the team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {staff.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            {staff.data?.slice(0, 3).map((s) => (
              <div key={s.user_id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={imageUrl(s.avatar_url)} alt={s.name} />
                  <AvatarFallback>{s.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.role_title}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={ROUTES.book}>Book</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended for you</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-lg" />
              ))}
            {services.data?.slice(3, 6).map((s) => (
              <div key={s.id} className="overflow-hidden rounded-lg border">
                <img
                  src={imageUrl(s.image_url) ?? ''}
                  alt={s.name}
                  className="h-32 w-full object-cover"
                />
                <div className="p-4">
                  <p className="font-medium">{s.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold text-primary">
                      ₹{Number(s.price_inr).toLocaleString('en-IN')}
                    </span>
                    <Button size="sm" asChild>
                      <Link to={ROUTES.book}>Book</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomerDashboardPage;
