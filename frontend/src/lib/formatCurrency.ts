/**
 * Format a rupee amount the way every page already writes it inline
 * ("₹1,499") — pulled out once so the POS screen (and anything after it)
 * has a single source of truth instead of repeating the template string.
 */
export function formatInr(value: number | string): string {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}
