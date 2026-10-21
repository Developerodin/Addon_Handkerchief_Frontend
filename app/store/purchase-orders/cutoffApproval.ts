import { PurchaseOrderLine } from '@/shared/services/factoryApi';

/**
 * Cutoff key shared with the lot: fabric id, or the line id when the line has none.
 */
export function cutoffKey(line: { fabricId?: string; lineId: string }): string {
  return String(line.fabricId || line.lineId);
}

/**
 * Keys whose cutoff row is already approved.
 */
export function approvedCutoffKeys(cutoffs: Array<{ fabricId: string; approved: boolean }> = []): Set<string> {
  return new Set(cutoffs.filter((row) => row.approved).map((row) => String(row.fabricId)));
}

/**
 * True when this purchase-order line's cutoff is approved.
 */
export function lineCutoffApproved(
  line: { fabricId?: string; lineId: string },
  cutoffs: Array<{ fabricId: string; approved: boolean }> = []
): boolean {
  return approvedCutoffKeys(cutoffs).has(cutoffKey(line));
}

/**
 * Approve/reject choice for each line, taken from the lot. Missing rows stay rejected.
 */
export function cutoffChoices(
  lines: PurchaseOrderLine[],
  cutoffs: Array<{ fabricId: string; approved: boolean }> = []
): Record<string, boolean> {
  const approved = approvedCutoffKeys(cutoffs);
  return Object.fromEntries(lines.map((line) => [cutoffKey(line), approved.has(cutoffKey(line))]));
}
