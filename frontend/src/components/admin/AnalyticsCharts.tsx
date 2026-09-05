import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { formatInr } from '@/lib/formatCurrency';
import { CHART_COLORS } from '@/lib/chartColors';

const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' };

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  formatLabel,
}: TooltipContentProps<ValueType, NameType> & {
  formatter?: (v: number) => string;
  formatLabel?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-medium">
          {formatLabel ? formatLabel(String(label)) : String(label)}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: (p.color ?? p.fill ?? CHART_COLORS[0]) as string }}
          />
          {p.name}:{' '}
          <span className="font-medium text-foreground">
            {formatter ? formatter(Number(p.value)) : String(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

// -------- Revenue trend (area chart) --------

export function RevenueTrendChart({
  data,
}: {
  data: { date: string; revenueInr: number; salesCount: number }[];
}) {
  const sparse = data.length > 45;
  const empty = data.every((d) => d.revenueInr === 0);
  if (empty) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No data in this range
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          interval={sparse ? Math.ceil(data.length / 10) : 'preserveStartEnd'}
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
          }
          minTickGap={20}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltip
              {...props}
              formatter={(v) => formatInr(v)}
              formatLabel={(v) =>
                new Date(v).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              }
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="revenueInr"
          name="Revenue"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// -------- Donut with side legend --------

export function DonutChart({
  data,
  colors = CHART_COLORS,
  valueFormatter,
}: {
  data: { name: string; value: number }[];
  colors?: string[];
  valueFormatter?: (v: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No data in this range
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={colors[i % colors.length]}
                stroke="var(--popover)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={(props) => <ChartTooltip {...props} formatter={valueFormatter} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="min-w-0 flex-1 truncate capitalize text-muted-foreground">
              {d.name}
            </span>
            <span className="font-medium tabular-nums">
              {valueFormatter ? valueFormatter(d.value) : d.value}
            </span>
            <span className="w-10 text-right text-muted-foreground tabular-nums">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------- Ranked horizontal bars (top services/products/staff/category) --------

export function RankedBarChart({
  data,
  color = CHART_COLORS[0],
  valueFormatter = (v: number) => String(v),
}: {
  data: { name: string; value: number }[];
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No data in this range
      </div>
    );
  }
  const height = Math.max(data.length * 34, 120);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ ...AXIS_TICK, fill: 'var(--foreground)' }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={(props) => <ChartTooltip {...props} formatter={valueFormatter} />}
        />
        <Bar dataKey="value" name="Value" fill={color} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// -------- Simple vertical bars (peak hours, weekday demand, ratings) --------

export function SimpleBarChart({
  data,
  xKey,
  color = CHART_COLORS[0],
  height = 200,
  valueFormatter = (v: number) => String(v),
}: {
  data: Record<string, string | number>[];
  xKey: string;
  color?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const empty = data.every((d) => Number(d.count ?? 0) === 0);
  if (empty) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data in this range
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={30}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={(props) => <ChartTooltip {...props} formatter={valueFormatter} />}
        />
        <Bar dataKey="count" name="Bookings" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
