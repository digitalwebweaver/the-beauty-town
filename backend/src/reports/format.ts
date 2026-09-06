// Standalone formatting helpers for the PDF report templates — mirrors the
// conventions in frontend/src/lib/formatCurrency.ts and formatDate.ts, but
// kept as its own copy since this runs in a completely separate runtime
// (Node, generating PDFs) with no access to the frontend's modules.

/** 1499 -> "₹1,499" (Indian digit grouping — needs the NotoSans font, see fonts.ts) */
export function formatInr(value: number | string): string {
  const n = Number(value);
  return `₹${Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}`;
}

const MONTH_NAMES = [
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

/** "2026-07-22" -> "22 Jul 2026" */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(`${iso}T00:00:00`) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** A timestamptz-ish value -> "22 Jul 2026, 4:30 PM" (report-generated-at footer). */
export function formatDateTimeStamp(d: Date): string {
  const date = formatDate(d);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

/** "14:30:00" -> "2:30 PM" */
export function formatTime(hms: string): string {
  const [hStr, mStr] = hms.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** 0.4271 (or 42.71) -> "42.7%" */
export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}
