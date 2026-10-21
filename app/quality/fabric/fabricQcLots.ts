import { PurchaseOrderRow, ReceivedLot } from '@/shared/services/factoryApi';

export type LotQcStatus = 'pending' | 'passed' | 'held' | 'rejected';
export type LotQcAction = 'pass' | 'reject' | 'hold';

/**
 * Local calendar date as YYYY-MM-DD.
 */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * QC queue window: last 30 days, same as PO received.
 */
export function defaultQcRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

/**
 * History window: last 12 months.
 */
export function historyQcRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setFullYear(to.getFullYear() - 1);
  return { from: isoDate(from), to: isoDate(to) };
}

/**
 * Missing status is still waiting for QC.
 */
export function lotQcStatus(lot: ReceivedLot): LotQcStatus {
  if (lot.qcStatus === 'passed' || lot.qcStatus === 'held' || lot.qcStatus === 'rejected') return lot.qcStatus;
  return 'pending';
}

/**
 * Received lots that actually have rolls to check.
 */
export function activeReceivedLots(order: PurchaseOrderRow): ReceivedLot[] {
  return (order.receivedLots || []).filter((lot) => Number(lot.rolls) > 0);
}

/**
 * How many received lots on this PO are still in the QC queue.
 */
export function pendingQcCount(order: PurchaseOrderRow): number {
  return activeReceivedLots(order).filter((lot) => lotQcStatus(lot) === 'pending').length;
}

/**
 * Lots that already have a pass or hold.
 */
export function finishedQcLots(order: PurchaseOrderRow): ReceivedLot[] {
  return activeReceivedLots(order).filter((lot) => lotQcStatus(lot) !== 'pending');
}

/**
 * Quantity recorded on received-lot lines.
 */
export function receivedQuantity(order: PurchaseOrderRow): number {
  return (order.receivedLots || []).reduce(
    (sum, lot) => sum + (lot.lines || []).reduce((inner, line) => inner + (Number(line.receivedQuantity) || 0), 0),
    0
  );
}

/**
 * Short label for a lot QC status.
 */
export function formatQcStatus(status: string): string {
  if (status === 'passed') return 'QC Accepted';
  if (status === 'held') return 'QC Held';
  if (status === 'rejected') return 'QC Rejected';
  return 'QC Pending';
}

/**
 * Badge classes for a lot QC status.
 */
export function qcStatusClass(status: string): string {
  if (status === 'passed') return 'bg-green-100 text-green-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  if (status === 'held') return 'bg-orange-100 text-orange-800';
  return 'bg-yellow-100 text-yellow-800';
}
