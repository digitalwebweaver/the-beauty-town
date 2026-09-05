import type { AppointmentStatus } from '@/types';

// Shared by StatusBadge.tsx and anywhere else that needs to color a
// status directly (e.g. a status Select's trigger, so it doesn't need a
// second, separate badge next to it just to show the same value in color).
export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/15',
  confirmed: 'bg-blue-500/15 text-blue-700 hover:bg-blue-500/15',
  in_progress: 'bg-violet-500/15 text-violet-700 hover:bg-violet-500/15',
  completed: 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15',
  cancelled: 'bg-red-500/15 text-red-700 hover:bg-red-500/15',
  no_show: 'bg-slate-500/15 text-slate-700 hover:bg-slate-500/15',
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};
