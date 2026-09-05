import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/common/PageHeader';
import { TIME_SLOTS } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { useAllAppointments } from '@/services/appointments.api';
import { useMyAvailability, useSaveMyAvailability } from '@/services/staff.api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_LABEL: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};
// DB day_of_week is ISO-ish: 0 = Sunday .. 6 = Saturday.
const DAY_OF_WEEK: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const DOW_TO_LABEL = Object.fromEntries(Object.entries(DAY_OF_WEEK).map(([k, v]) => [v, k]));

function mondayOfThisWeek(): Date {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function SchedulePage() {
  const availQuery = useMyAvailability();
  const saveMut = useSaveMyAvailability();

  // Seed local editable state once the saved availability loads — same
  // "adjust state during render" pattern used elsewhere in the app.
  // Days with no saved row yet default to Mon-Sat on, Sunday off.
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null);
  const [seeded, setSeeded] = useState(false);
  if (availQuery.data && !seeded) {
    setSeeded(true);
    const byDow = new Map(availQuery.data.map((d) => [d.dayOfWeek, d.isAvailable]));
    const next: Record<string, boolean> = {};
    for (const label of DAYS) {
      const dow = DAY_OF_WEEK[label];
      next[label] = byDow.has(dow) ? (byDow.get(dow) ?? false) : label !== 'Sun';
    }
    setAvailability(next);
  }

  const monday = useMemo(() => mondayOfThisWeek(), []);
  const sunday = useMemo(() => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d;
  }, [monday]);
  const apptsQuery = useAllAppointments({ from: toDateStr(monday), to: toDateStr(sunday) });

  // Real busy slots from this week's actual bookings — replaces the old
  // hardcoded BUSY_SLOTS mock. An appointment marks every 30-min slot its
  // [start, end) range touches, not just its start slot.
  const busyByDay = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const label of DAYS) map[label] = new Set();
    for (const a of apptsQuery.data ?? []) {
      if (a.status === 'cancelled' || a.status === 'no_show') continue;
      const dow = new Date(`${a.appointment_date}T00:00:00`).getDay();
      const label = DOW_TO_LABEL[dow];
      if (!label) continue;
      const start = a.start_time.slice(0, 5);
      const end = a.end_time.slice(0, 5);
      for (const slot of TIME_SLOTS) {
        if (slot >= start && slot < end) map[label].add(slot);
      }
    }
    return map;
  }, [apptsQuery.data]);

  const toggleDay = (day: string, checked: boolean) => {
    if (!availability) return;
    const next = { ...availability, [day]: checked };
    setAvailability(next);
    toast.success(`${FULL_DAY_LABEL[day]} ${checked ? 'enabled' : 'disabled'}`);
    saveMut.mutate(
      DAYS.map((label) => ({
        dayOfWeek: DAY_OF_WEEK[label],
        isAvailable: next[label],
      })),
      {
        onError: () => toast.error("Couldn't save — try again"),
      }
    );
  };

  const loading = availQuery.isLoading || !availability;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Schedule"
        description="Set your weekly availability and view booked slots."
      />

      <Card>
        <CardHeader>
          <CardTitle>Weekly availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))
            : DAYS.map((d) => (
                <div key={d} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{FULL_DAY_LABEL[d]}</p>
                    <p className="text-sm text-muted-foreground">
                      {availability?.[d] ? '10:00 – 19:00' : 'Day off'}
                    </p>
                  </div>
                  <Switch
                    checked={availability?.[d] ?? false}
                    onCheckedChange={(v) => toggleDay(d, v)}
                    disabled={saveMut.isPending}
                  />
                </div>
              ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This week's bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {apptsQuery.isLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-8 gap-1 text-xs">
                  <div />
                  {DAYS.map((d) => (
                    <div key={d} className="text-center font-semibold">
                      {d}
                    </div>
                  ))}

                  {TIME_SLOTS.map((t) => (
                    <div key={t} className="contents">
                      <div className="pt-2 text-right text-muted-foreground">{t}</div>
                      {DAYS.map((d) => {
                        const busy = busyByDay[d]?.has(t);
                        const off = !(availability?.[d] ?? false);
                        return (
                          <div
                            key={d + t}
                            className={cn(
                              'h-8 rounded-sm',
                              off && 'bg-muted',
                              busy && 'bg-blue-500/70',
                              !off && !busy && 'bg-emerald-500/15'
                            )}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-emerald-500/15" />
                    Available
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-blue-500/70" />
                    Booked
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-muted" />
                    Off
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SchedulePage;
