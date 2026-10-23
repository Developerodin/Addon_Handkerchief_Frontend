import { PurchaseOrderLine, PurchaseOrderRow, ReceivedLot } from '@/shared/services/factoryApi';

export interface GoodsReceivedLineDraft {
  lineId: string;
  receivedQuantity: string;
}

export interface GoodsReceivedLotDraft {
  key: string;
  lotNumber: string;
  rolls: string;
  grossWeight: string;
  netWeight: string;
  lines: GoodsReceivedLineDraft[];
  /** True when this lot was already stored on the purchase order. */
  saved: boolean;
  /** Saved lots stay locked until the user clicks Edit lot. */
  editing: boolean;
}

/**
 * Blank received-lot row.
 */
export function emptyGoodsLot(): GoodsReceivedLotDraft {
  return {
    key: `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lotNumber: '',
    rolls: '',
    grossWeight: '',
    netWeight: '',
    lines: [{ lineId: '', receivedQuantity: '' }],
    saved: false,
    editing: true,
  };
}

/**
 * Saved lots are read-only until Edit lot is clicked.
 */
export function lotIsLocked(lot: GoodsReceivedLotDraft): boolean {
  return lot.saved && !lot.editing;
}

/**
 * Turns saved lots into locked drawer rows. Edit lot unlocks one row.
 */
export function draftsFromLots(lots: ReceivedLot[] = []): GoodsReceivedLotDraft[] {
  if (!lots.length) return [emptyGoodsLot()];
  return lots.map((lot) => ({
    key: `lot-${lot.lotNumber}-${Math.random().toString(36).slice(2, 6)}`,
    lotNumber: lot.lotNumber,
    rolls: String(lot.rolls ?? ''),
    grossWeight: String(lot.grossWeight ?? ''),
    netWeight: String(lot.netWeight ?? ''),
    lines: (lot.lines || []).map((line) => ({
      lineId: line.lineId,
      receivedQuantity: String(line.receivedQuantity ?? ''),
    })),
    saved: true,
    editing: false,
  }));
}

/**
 * Received quantity already entered for one PO line across the open lots.
 */
export function receivedForLine(lots: GoodsReceivedLotDraft[], lineId: string): number {
  return lots.reduce(
    (sum, lot) => sum + lot.lines.reduce((inner, line) => inner + (line.lineId === lineId ? Number(line.receivedQuantity) || 0 : 0), 0),
    0
  );
}

/**
 * Order total including GST.
 */
export function orderTotal(lines: PurchaseOrderLine[] = []): number {
  return lines.reduce((sum, line) => {
    const sub = (line.quantity || 0) * (line.rate || 0);
    return sum + sub + (sub * (line.gstPercent || 0)) / 100;
  }, 0);
}

/** Fabric line shown in the order table and the lot picker. */
export function fabricLineLabel(line: PurchaseOrderLine): string {
  return (
    [line.fabricName, line.fabricSortNo, line.fabricTypeName, line.colourName].filter(Boolean).join(' · ') || line.lineId
  );
}

/**
 * First problem on the received lots, or an empty string.
 */
export function goodsLotsError(lots: GoodsReceivedLotDraft[]): string {
  if (!lots.length) return 'Add at least one received lot';
  for (let index = 0; index < lots.length; index += 1) {
    const lot = lots[index];
    const label = `Lot ${index + 1}`;
    if (!lot.lotNumber.trim()) return `${label}: lot number is required`;
    if (!(Number(lot.rolls) > 0)) return `${label}: rolls must be greater than 0`;
    if (!(Number(lot.grossWeight) > 0)) return `${label}: gross weight must be greater than 0`;
    if (!(Number(lot.netWeight) > 0)) return `${label}: net weight must be greater than 0`;
    const picked = lot.lines.filter((line) => line.lineId);
    if (!picked.length) return `${label}: select at least one PO line`;
    if (picked.some((line) => !(Number(line.receivedQuantity) > 0))) return `${label}: received quantity must be greater than 0`;
  }
  return '';
}

/**
 * Payload stored on the purchase order.
 */
export function goodsLotsPayload(lots: GoodsReceivedLotDraft[], order: PurchaseOrderRow) {
  return {
    lots: lots.map((lot) => ({
      lotNumber: lot.lotNumber.trim(),
      rolls: Number(lot.rolls),
      grossWeight: Number(lot.grossWeight),
      netWeight: Number(lot.netWeight),
      lines: lot.lines
        .filter((line) => line.lineId)
        .map((line) => ({ lineId: line.lineId, receivedQuantity: Number(line.receivedQuantity) })),
    })),
    order,
  };
}
