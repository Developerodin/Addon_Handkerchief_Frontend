import { formatQty } from '../ReportTable';

/**
 * Metres, with the same grouping as the other store reports.
 * @param value - Roll metres from QC
 */
export function formatMeters(value: number): string {
  return `${formatQty(value)} m`;
}
