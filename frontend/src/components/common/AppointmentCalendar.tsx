import { useMemo, useState, type ReactNode } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AppointmentListItem } from '@/services/appointments.api';

// Solid dot colors — same hues StatusBadge uses for its translucent
// backgrounds, just solid so they read at a glance inside a small day cell.
const STATUS_DOT_CLASS: Record<AppointmentListItem['status'], string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-violet-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
  no_show: 'bg-slate-500',
};

interface AppointmentCalendarProps {
  appointments: AppointmentListItem[];
  renderAppointment: (a: AppointmentListItem) => ReactNode;
}

// Fixed order so a day's status dots always read the same way, not shuffled
// by insertion order.
const STATUS_ORDER: AppointmentListItem['status'][] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

function AppointmentCalendar({ appointments, renderAppointment }: AppointmentCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));

  const byDate = useMemo(() => {
    const map = new Map<string, AppointmentListItem[]>();
    for (const a of appointments) {
      const list = map.get(a.appointment_date);
      if (list) list.push(a);
      else map.set(a.appointment_date, [a]);
    }
    return map;
  }, [appointments]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const weekdayLabels = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(viewMonth, { weekStartsOn: 1 }),
        end: endOfWeek(viewMonth, { weekStartsOn: 1 }),
      }).map((d) => format(d, 'EEE')),
    [viewMonth]
  );

  const selectedAppointments = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">{format(viewMonth, 'MMMM yyyy')}</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setViewMonth((m) => subMonths(m, 1));
                  setSelectedDate(null);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewMonth(startOfMonth(new Date()));
                  setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setViewMonth((m) => addMonths(m, 1));
                  setSelectedDate(null);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {weekdayLabels.map((w) => (
              <div key={w} className="py-1 font-medium">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const dayAppointments = byDate.get(key) ?? [];
              const inMonth = isSameMonth(d, viewMonth);
              const selected = key === selectedDate;
              const statuses = STATUS_ORDER.filter((s) =>
                dayAppointments.some((a) => a.status === s)
              );

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    'flex min-h-16 flex-col items-center gap-1 rounded-lg border p-1.5 text-sm transition-colors',
                    !inMonth && 'border-transparent text-muted-foreground/50',
                    inMonth && !selected && 'hover:bg-accent',
                    selected && 'border-primary bg-primary/5',
                    isToday(d) && !selected && 'border-muted-foreground/30'
                  )}
                >
                  <span className={cn('font-medium', isToday(d) && 'text-primary')}>
                    {format(d, 'd')}
                  </span>
                  {dayAppointments.length > 0 && (
                    <>
                      <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                        {dayAppointments.length}
                      </span>
                      <div className="flex gap-0.5">
                        {statuses.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASS[s])}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-6">
        <CardContent className="space-y-3 p-4 md:p-5">
          <h3 className="font-semibold">
            {selectedDate
              ? format(new Date(`${selectedDate}T00:00:00`), 'EEEE, MMM d')
              : 'Pick a day'}
          </h3>

          {!selectedDate ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5" />
              Tap a day on the calendar to see its appointments.
            </div>
          ) : selectedAppointments.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Nothing booked this day.
            </div>
          ) : (
            <div className="space-y-3">{selectedAppointments.map(renderAppointment)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AppointmentCalendar;
