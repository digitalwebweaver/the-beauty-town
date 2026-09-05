/**
 * Human-friendly date/time formatting helpers.
 *
 * Backend now returns:
 *   appointment_date: "2026-07-22"    (plain string, no timezone shift)
 *   start_time:       "16:30:00"      (HH:MM:SS)
 *
 * These helpers turn them into readable Indian-locale strings.
 */

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function parseISO(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * "2026-07-22" → "22 Jul 2026"
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = parseISO(iso);
  if (!d) return iso;
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * "2026-07-22" → "Wed, 22 Jul"
 */
export function formatDateShort(iso?: string | null): string {
  if (!iso) return '';
  const d = parseISO(iso);
  if (!d) return iso;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${day}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
}

/**
 * "16:30:00" or "16:30" → "4:30 PM"
 */
export function formatTime(hhmm?: string | null): string {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * ("2026-07-22", "16:30:00") → "22 Jul 2026 · 4:30 PM"
 */
export function formatDateTime(isoDate?: string | null, time?: string | null): string {
  const d = formatDate(isoDate);
  const t = formatTime(time);
  if (!d && !t) return '';
  if (!t) return d;
  if (!d) return t;
  return `${d} · ${t}`;
}

/**
 * ("2026-07-22", "16:30:00", "17:45:00") → "22 Jul 2026 · 4:30 PM – 5:45 PM"
 */
export function formatDateTimeRange(
  isoDate?: string | null,
  startTime?: string | null,
  endTime?: string | null
): string {
  const d = formatDate(isoDate);
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  if (!d) return end ? `${start} – ${end}` : start;
  if (!end) return `${d} · ${start}`;
  return `${d} · ${start} – ${end}`;
}

/**
 * ISO timestamp like "2026-07-19T04:12:33.000Z" → "19 Jul 2026"
 */
export function formatCreatedAt(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}
