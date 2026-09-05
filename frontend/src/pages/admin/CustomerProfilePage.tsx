import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  CalendarCheck,
  CalendarClock,
  ExternalLink,
  Receipt,
  ScissorsSquare,
  Wallet,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import SectionError from '@/components/common/SectionError';
import { ROUTES } from '@/constants/routes';
import { imageUrl } from '@/lib/imageUrl';
import { formatInr } from '@/lib/formatCurrency';
import { formatCreatedAt, formatDate, formatTime } from '@/lib/formatDate';
import { useCustomerDetail } from '@/services/users.api';
import type { AppointmentStatus } from '@/services/appointments.api';

const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', card: 'Card', upi: 'UPI' };

function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useCustomerDetail(id ?? null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return <SectionError message="Couldn't load this customer." onRetry={() => refetch()} />;
  }

  const { customer, stats, appointments, sales } = data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to customers
      </Button>

      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={imageUrl(customer.avatar_url)} alt={customer.name} />
              <AvatarFallback>{customer.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold">{customer.name}</p>
                {!customer.is_active && <Badge variant="outline">Inactive</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
              <p className="text-sm text-muted-foreground">
                {customer.phone ?? 'No phone on file'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Customer since {formatCreatedAt(customer.created_at)}
                {stats.lastVisitAt && ` · last visit ${formatCreatedAt(stats.lastVisitAt)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={ROUTES.adminBook}>Book appointment</Link>
            </Button>
            <Button asChild>
              <Link to={ROUTES.adminBilling}>Ring up a bill</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Visits" value={String(stats.totalVisits)} icon={CalendarCheck} />
        <StatCard label="Upcoming" value={String(stats.upcoming)} icon={CalendarClock} />
        <StatCard label="Bills rung up" value={String(stats.totalBills)} icon={Receipt} />
        <StatCard label="Total spend" value={formatInr(stats.totalSpend_inr)} icon={Wallet} />
        <StatCard label="Avg. bill" value={formatInr(stats.avgBill_inr)} icon={Banknote} />
        <StatCard
          label="Last visit"
          value={stats.lastVisitAt ? formatCreatedAt(stats.lastVisitAt) : '—'}
          icon={ScissorsSquare}
        />
      </div>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
          <TabsTrigger value="billing">Billing history ({sales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <Card>
            <CardContent className="p-6">
              {appointments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                  No appointments booked yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date &amp; time</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Stylist</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <p>{formatDate(a.appointment_date)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(a.start_time)} – {formatTime(a.end_time)}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <p className="truncate">{a.service_names.join(' + ')}</p>
                          </TableCell>
                          <TableCell>{a.staff_name ?? '—'}</TableCell>
                          <TableCell>{formatInr(a.total_inr)}</TableCell>
                          <TableCell>
                            <StatusBadge status={a.status as AppointmentStatus} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardContent className="p-6">
              {sales.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                  No bills rung up for this customer yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Stylist</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <p>{formatCreatedAt(s.created_at)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(s.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <p className="truncate">{s.item_names.join(', ')}</p>
                          </TableCell>
                          <TableCell>{s.staff_name ?? '—'}</TableCell>
                          <TableCell>
                            {s.payments.map((p, i) => (
                              <span key={i} className="mr-1 text-xs text-muted-foreground">
                                {PAYMENT_LABELS[p.method] ?? p.method}
                              </span>
                            ))}
                          </TableCell>
                          <TableCell>
                            {Number(s.discount_inr) > 0 ? `−${formatInr(s.discount_inr)}` : '—'}
                          </TableCell>
                          <TableCell className="font-medium">{formatInr(s.total_inr)}</TableCell>
                          <TableCell>
                            {s.status === 'void' ? (
                              <Badge variant="outline" className="text-destructive">
                                Void
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                                Completed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={ROUTES.invoice(s.id)} target="_blank">
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CustomerProfilePage;
