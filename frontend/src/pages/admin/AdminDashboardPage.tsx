import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  IndianRupee,
  PackageX,
  Receipt,
  ScissorsSquare,
  Tag,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import {
  DonutChart,
  RankedBarChart,
  RevenueTrendChart,
  SimpleBarChart,
} from '@/components/admin/AnalyticsCharts';
import { CHART_COLORS } from '@/lib/chartColors';
import { formatInr } from '@/lib/formatCurrency';
import { imageUrl } from '@/lib/imageUrl';
import { ROUTES } from '@/constants/routes';
import { useDashboardAnalytics, type DashboardRange } from '@/services/analytics.api';

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 365, label: '1Y' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', card: 'Card', upi: 'UPI' };

const HOUR_LABEL = (h: number) => {
  const period = h < 12 ? 'a' : 'p';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${period}`;
};

function pct(n: number, digits = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

function AdminDashboardPage() {
  const [range, setRange] = useState<DashboardRange>(30);
  const { data, isLoading } = useDashboardAnalytics(range);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview"
        description="A snapshot of your salon's performance."
        actions={
          <div className="inline-flex overflow-hidden rounded-md border">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                type="button"
                size="sm"
                variant={range === r.value ? 'default' : 'ghost'}
                className="rounded-none"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        }
      />

      {isLoading && !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        s && (
          <>
            {/* -------- KPI grid -------- */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label={`Revenue (${range}D)`}
                value={formatInr(s.revenueInr)}
                icon={IndianRupee}
                delta={
                  s.revenueChangePct !== null
                    ? `${pct(s.revenueChangePct)} vs prior · Lifetime ${formatInr(s.lifetimeRevenueInr)}`
                    : `Lifetime ${formatInr(s.lifetimeRevenueInr)}`
                }
                trend={
                  s.revenueChangePct === null
                    ? 'flat'
                    : s.revenueChangePct > 0.5
                      ? 'up'
                      : s.revenueChangePct < -0.5
                        ? 'down'
                        : 'flat'
                }
              />
              <StatCard
                label="Avg ticket size"
                value={formatInr(s.avgTicketInr)}
                icon={Receipt}
                delta={`${s.salesCount} bill${s.salesCount === 1 ? '' : 's'} rung up`}
                trend="flat"
              />
              <StatCard
                label="Appointments"
                value={`${s.completedAppointments}/${s.totalAppointments}`}
                icon={CalendarClock}
                delta={`${s.appointmentsToday} today`}
                trend="flat"
              />
              <StatCard
                label="New customers"
                value={String(s.newCustomers)}
                icon={UserPlus}
                delta={`${s.returningCustomers} returning`}
                trend="flat"
              />
              <StatCard
                label="No-show rate"
                value={`${s.noShowRatePct.toFixed(1)}%`}
                icon={AlertTriangle}
                delta={`${s.totalAppointments} booked`}
                trend={s.noShowRatePct <= 5 ? 'up' : s.noShowRatePct <= 15 ? 'flat' : 'down'}
              />
              <StatCard
                label="Active staff"
                value={String(s.activeStaffCount)}
                icon={ScissorsSquare}
                delta={`${s.totalCustomers} customers total`}
                trend="flat"
              />
              <StatCard
                label="Low stock alerts"
                value={String(s.lowStockCount)}
                icon={PackageX}
                delta={s.lowStockCount > 0 ? 'Needs reorder' : 'All stocked up'}
                trend={s.lowStockCount > 0 ? 'down' : 'up'}
              />
              <StatCard
                label="Coupon savings given"
                value={formatInr(s.couponDiscountInr)}
                icon={Tag}
                delta={`${s.couponRedemptions} redemption${s.couponRedemptions === 1 ? '' : 's'}`}
                trend="flat"
              />
            </div>

            {/* -------- Revenue trend + appointment mix -------- */}
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue trend</CardTitle>
                  <CardDescription>Completed sales over the last {range} days</CardDescription>
                </CardHeader>
                <CardContent>
                  <RevenueTrendChart data={data.revenueSeries} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Appointment mix</CardTitle>
                  <CardDescription>By status, this range</CardDescription>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    data={data.appointmentStatusBreakdown.map((a) => ({
                      name: STATUS_LABELS[a.status] ?? a.status,
                      value: a.count,
                    }))}
                  />
                </CardContent>
              </Card>
            </div>

            {/* -------- Top sellers -------- */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top services by revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <RankedBarChart
                    data={data.topServices.map((t) => ({ name: t.name, value: t.revenueInr }))}
                    color={CHART_COLORS[0]}
                    valueFormatter={(v) => formatInr(v)}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top products by revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <RankedBarChart
                    data={data.topProducts.map((t) => ({ name: t.name, value: t.revenueInr }))}
                    color={CHART_COLORS[2]}
                    valueFormatter={(v) => formatInr(v)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* -------- Category revenue + payment methods -------- */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by category</CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    data={data.categoryRevenue.map((c) => ({ name: c.label, value: c.revenueInr }))}
                    valueFormatter={(v) => formatInr(v)}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Payment methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    data={data.paymentMethodBreakdown.map((p) => ({
                      name: PAYMENT_LABELS[p.method] ?? p.method,
                      value: p.amountInr,
                    }))}
                    colors={[CHART_COLORS[3], CHART_COLORS[2], CHART_COLORS[1]]}
                    valueFormatter={(v) => formatInr(v)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* -------- Staff performance -------- */}
            <Card>
              <CardHeader>
                <CardTitle>Staff performance</CardTitle>
                <CardDescription>Revenue rung up per staff member, this range</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RankedBarChart
                  data={data.staffPerformance.map((st) => ({
                    name: st.name,
                    value: st.revenueInr,
                  }))}
                  color={CHART_COLORS[4]}
                  valueFormatter={(v) => formatInr(v)}
                />
                {data.staffPerformance.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Bills</TableHead>
                          <TableHead className="text-right">Appointments</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.staffPerformance.map((st) => (
                          <TableRow key={st.id}>
                            <TableCell className="flex items-center gap-2 font-medium">
                              <img
                                src={imageUrl(st.avatarUrl) ?? undefined}
                                alt=""
                                className="h-6 w-6 rounded-full bg-muted object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.visibility = 'hidden';
                                }}
                              />
                              {st.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{st.roleTitle}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {st.salesCount}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {st.appointmentsCount}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatInr(st.revenueInr)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              ⭐ {st.rating.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* -------- Demand patterns -------- */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Peak booking hours</CardTitle>
                  <CardDescription>Appointments by hour of day</CardDescription>
                </CardHeader>
                <CardContent>
                  <SimpleBarChart
                    data={data.peakHours.map((h) => ({ hour: HOUR_LABEL(h.hour), count: h.count }))}
                    xKey="hour"
                    color={CHART_COLORS[1]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Bookings by weekday</CardTitle>
                  <CardDescription>Which days fill up fastest</CardDescription>
                </CardHeader>
                <CardContent>
                  <SimpleBarChart data={data.bookingsByDay} xKey="day" color={CHART_COLORS[5]} />
                </CardContent>
              </Card>
            </div>

            {/* -------- Alerts & marketing -------- */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Low stock alerts</CardTitle>
                    <CardDescription>At or below reorder level</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={ROUTES.adminInventory}>
                      View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {data.lowStockProducts.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Everything's well stocked.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.lowStockProducts.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg border p-3 text-sm"
                        >
                          <span className="font-medium">{p.name}</span>
                          <Badge variant={p.stock === 0 ? 'destructive' : 'outline'}>
                            {p.stock} left · reorder at {p.reorderLevel}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Top coupons</CardTitle>
                    <CardDescription>By redemptions, this range</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={ROUTES.adminCoupons}>
                      View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {data.couponPerformance.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No coupons redeemed in this range.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.couponPerformance.map((c) => (
                        <div
                          key={c.code}
                          className="flex items-center justify-between rounded-lg border p-3 text-sm"
                        >
                          <span className="font-mono font-medium">{c.code}</span>
                          <span className="text-muted-foreground">
                            {c.redemptions} used · {formatInr(c.discountInr)} given
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* -------- Reviews -------- */}
            <Card>
              <CardHeader>
                <CardTitle>Customer ratings</CardTitle>
                <CardDescription>
                  {data.reviews.count > 0
                    ? `${data.reviews.avgRating.toFixed(1)} average from ${data.reviews.count} review${data.reviews.count === 1 ? '' : 's'} this range`
                    : 'No reviews in this range'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  data={data.reviews.breakdown.map((b) => ({
                    stars: `${b.stars}★`,
                    count: b.count,
                  }))}
                  xKey="stars"
                  color={CHART_COLORS[0]}
                  height={160}
                />
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}

export default AdminDashboardPage;
