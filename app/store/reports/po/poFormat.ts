/**
 * Indian grouped number with up to three decimals.
 * @param value - Quantity from a purchase order
 */
export function formatQty(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(value || 0);
}

/**
 * Rupee amount for order value.
 * @param value - Line or order value
 */
export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

/**
 * Calendar date in the same style as the rest of the store.
 * @param value - ISO date from the API
 */
export function formatDay(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Date and time for a status change, receipt, or approval.
 * @param value - ISO timestamp from the API
 */
export function formatWhen(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * A clock time when one was stored, otherwise just the day.
 * Midnight UTC is how a date picker is saved.
 * @param value - ISO timestamp from the API
 */
export function formatStamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dateOnly =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
  return dateOnly ? formatDay(value) : formatWhen(value);
}

/**
 * Days as a short phrase. Missing values stay a dash.
 * @param value - Whole or half days
 */
export function formatDays(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value} ${value === 1 ? 'day' : 'days'}`;
}
