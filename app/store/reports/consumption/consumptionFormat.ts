import { ConsumptionBand } from './consumptionTypes';

/**
 * Indian grouped number with up to three decimals.
 * @param value - Quantity from the consumption report
 */
export function formatQty(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(value || 0);
}

/**
 * Metres with the unit, for cards and table cells.
 * @param value - Metre quantity
 */
export function formatMetres(value: number): string {
  return `${formatQty(value)} m`;
}

/**
 * Signed variance. Over-issue is positive.
 * @param value - Issued metres minus BOM metres
 */
export function formatVariance(value: number): string {
  const text = formatQty(Math.abs(value));
  if (value > 0.001) return `+${text} m`;
  if (value < -0.001) return `−${text} m`;
  return `${text} m`;
}

/**
 * Calendar day. Date-only values stay on that UTC day.
 * @param value - ISO date or YYYY-MM-DD
 */
export function formatDay(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Date and time for a roll issue or return.
 * @param value - ISO timestamp
 */
export function formatWhen(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Short label for a variance band.
 * @param band - Over, short, or on the BOM
 */
export function bandLabel(band: ConsumptionBand): string {
  if (band === 'over') return 'Over';
  if (band === 'under') return 'Short';
  return 'On BOM';
}

/**
 * Colour for a variance figure.
 * @param band - Over, short, or on the BOM
 */
export function varianceClass(band: ConsumptionBand): string {
  if (band === 'over') return 'text-[#9F1239]';
  if (band === 'under') return 'text-[#1D4ED8]';
  return 'text-[#166534]';
}

/**
 * Issue or return, in plain language.
 * @param kind - Stock movement kind
 */
export function movementLabel(kind: string): string {
  return kind === 'return-to-rack' ? 'Returned' : 'Issued';
}
