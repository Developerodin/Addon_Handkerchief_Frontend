import { PurchaseOrderLine, PurchaseOrderRow, ReceivedLot } from '@/shared/services/factoryApi';

export interface GoodsReceivedLineDraft {
  lineId: string;
  receivedQuantity: string;
  /** Physical rolls received for this PO item. Barcodes are minted from this count. */
  rolls: string;
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
 * Blank PO item row inside a received lot.
 */
export function emptyGoodsLine(): GoodsReceivedLineDraft {
  return { lineId: '', receivedQuantity: '', rolls: '' };
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
    lines: [emptyGoodsLine()],
    saved: false,
    editing: true,
  };
}

/**
 * Rolls typed on the PO item rows. That sum is the lot total.
 */
export function lineRollTotal(lines: GoodsReceivedLineDraft[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.rolls) || 0), 0);
}

/**
 * Rolls shown on the lot header.
 * A locked lot saved before per-item rolls still shows its stored total.
 */
export function lotRollTotal(lot: GoodsReceivedLotDraft): number {
  const fromLines = lineRollTotal(lot.lines);
  if (fromLines > 0) return fromLines;
  if (lot.saved && !lot.editing) return Number(lot.rolls) || 0;
  return fromLines;
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
    lines: draftLines(lot),
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
 * Fabric name, type, and color. Sort No is shown in its own column.
 */
export function fabricIdentityLabel(line: PurchaseOrderLine): string {
  return [line.fabricName, line.fabricTypeName, line.colourName].filter(Boolean).join(' · ') || line.lineId;
}

/**
 * Sort number on the PO line this roll was stamped from.
 */
export function rollSortNo(lineId: string | undefined, lines: PurchaseOrderLine[] = []): string {
  if (!lineId) return '';
  return lines.find((line) => line.lineId === lineId)?.fabricSortNo || '';
}

/**
 * Received-lot lines for the drawer.
 * A saved lot with one PO item and no per-item rolls keeps the old lot total on that row.
 */
function draftLines(lot: ReceivedLot): GoodsReceivedLineDraft[] {
  const source = lot.lines || [];
  if (!source.length) return [emptyGoodsLine()];
  const single = source.length === 1;
  return source.map((line) => ({
    lineId: line.lineId,
    receivedQuantity: String(line.receivedQuantity ?? ''),
    rolls: Number(line.rolls) > 0 ? String(line.rolls) : single && Number(lot.rolls) > 0 ? String(lot.rolls) : '',
  }));
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
    if (!(Number(lot.grossWeight) > 0)) return `${label}: gross weight must be greater than 0`;
    if (!(Number(lot.netWeight) > 0)) return `${label}: net weight must be greater than 0`;
    const picked = lot.lines.filter((line) => line.lineId);
    if (!picked.length) return `${label}: select at least one PO line`;
    if (new Set(picked.map((line) => line.lineId)).size !== picked.length) return `${label}: each PO item can only be selected once`;
    if (picked.some((line) => !(Number(line.receivedQuantity) > 0))) return `${label}: received metres must be greater than 0`;
    if (picked.some((line) => !(Number(line.rolls) > 0))) return `${label}: received rolls must be greater than 0`;
  }
  return '';
}

/**
 * Payload stored on the purchase order.
 */
export function goodsLotsPayload(lots: GoodsReceivedLotDraft[], order: PurchaseOrderRow) {
  return {
    lots: lots.map((lot) => {
      const lines = lot.lines
        .filter((line) => line.lineId)
        .map((line) => ({
          lineId: line.lineId,
          receivedQuantity: Number(line.receivedQuantity),
          rolls: Number(line.rolls),
        }));
      return {
        lotNumber: lot.lotNumber.trim(),
        rolls: lines.reduce((sum, line) => sum + line.rolls, 0),
        grossWeight: Number(lot.grossWeight),
        netWeight: Number(lot.netWeight),
        lines,
      };
    }),
    order,
  };
}
