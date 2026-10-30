import { PurchaseOrderLine, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { cutoffKey } from './cutoffApproval';

export interface SavedPackFile {
  url: string;
  key?: string;
  originalName: string;
  mimeType?: string;
  size?: number;
}

export interface PackingCartonExtra {
  label: string;
  value: string;
}

/** One carton row from a packing-list PDF. Totals on the packing list are sums of these rows. */
export interface PackingCarton {
  materialCode: string;
  millSortKey: string;
  fabricId?: string;
  fabricName?: string;
  fabricSortNo?: string;
  millOldFabricSortNo?: string;
  millNewFabricSortNo?: string;
  fabricTypeName?: string;
  colourName?: string;
  cartonNumber: string;
  count: string;
  netWeight: string;
  grossWeight: string;
  totalPcs: string;
  totalQty: string;
  uom: string;
  designShade: string;
  product: string;
  batch: string;
  finishWidth: string;
  lotNumber: string;
  size: string;
  lineId?: string;
  extras: PackingCartonExtra[];
}

export interface PackingListRow {
  id: string;
  packingListCode?: string;
  shipmentDate?: string;
  expectedDelivery?: string;
  rolls?: number;
  boxes?: number;
  weight?: number;
  quantity?: number;
  courierName?: string;
  courierNumber?: string;
  vehicleNumber?: string;
  challanNumber?: string;
  notes?: string;
  millName?: string;
  consigneeName?: string;
  customerCity?: string;
  invoiceNumber?: string;
  invoiceDate?: string | null;
  division?: string;
  lrNo?: string;
  lrDate?: string | null;
  lineIds?: string[];
  cartons?: Array<Partial<PackingCarton> & { count?: number | string; netWeight?: number | string; grossWeight?: number | string; totalPcs?: number | string; totalQty?: number | string; finishWidth?: number | string }>;
  files?: SavedPackFile[];
}

export interface TransitPackEntry {
  key: string;
  id?: string;
  lineIds: string[];
  packingNumber: string;
  courierName: string;
  courierNumber: string;
  vehicleNumber: string;
  challanNumber: string;
  dispatchDate: string;
  estimatedDelivery: string;
  rolls: string;
  weight: string;
  notes: string;
  millName: string;
  consigneeName: string;
  customerCity: string;
  invoiceNumber: string;
  invoiceDate: string;
  division: string;
  lrNo: string;
  lrDate: string;
  cartons: PackingCarton[];
  files: File[];
  savedFiles: SavedPackFile[];
}

/**
 * Local calendar date as YYYY-MM-DD.
 */
export function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * Blank packlist row. Dispatch defaults to today and delivery to the order date.
 */
export function emptyTransitEntry(order: PurchaseOrderRow | null): TransitPackEntry {
  return {
    key: `pack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lineIds: [],
    packingNumber: '',
    courierName: '',
    courierNumber: '',
    vehicleNumber: '',
    challanNumber: '',
    dispatchDate: todayIso(),
    estimatedDelivery: order?.estimatedDelivery ? order.estimatedDelivery.slice(0, 10) : '',
    rolls: '0',
    weight: '0.00',
    notes: '',
    millName: '',
    consigneeName: '',
    customerCity: '',
    invoiceNumber: '',
    invoiceDate: '',
    division: '',
    lrNo: '',
    lrDate: '',
    cartons: [],
    files: [],
    savedFiles: [],
  };
}

function cartonText(value: number | string | undefined): string {
  if (value == null || value === '') return '';
  return String(value);
}

function cartonFromSaved(row: NonNullable<PackingListRow['cartons']>[number]): PackingCarton {
  return {
    materialCode: row.materialCode || '',
    millSortKey: row.millSortKey || '',
    fabricId: row.fabricId || '',
    fabricName: row.fabricName || '',
    fabricSortNo: row.fabricSortNo || '',
    millOldFabricSortNo: row.millOldFabricSortNo || '',
    millNewFabricSortNo: row.millNewFabricSortNo || '',
    fabricTypeName: row.fabricTypeName || '',
    colourName: row.colourName || '',
    cartonNumber: row.cartonNumber || '',
    count: cartonText(row.count),
    netWeight: cartonText(row.netWeight),
    grossWeight: cartonText(row.grossWeight),
    totalPcs: cartonText(row.totalPcs),
    totalQty: cartonText(row.totalQty),
    uom: row.uom || '',
    designShade: row.designShade || '',
    product: row.product || '',
    batch: row.batch || '',
    finishWidth: cartonText(row.finishWidth),
    lotNumber: row.lotNumber || '',
    size: row.size || '',
    lineId: row.lineId || '',
    extras: (row.extras || []).map((extra) => ({ label: extra.label || '', value: extra.value || '' })),
  };
}

/**
 * Turns a saved packing list into a drawer row so a later open is prefilled.
 */
export function entryFromPackingList(row: PackingListRow): TransitPackEntry {
  return {
    key: row.id,
    id: row.id,
    lineIds: row.lineIds || [],
    packingNumber: row.packingListCode || '',
    courierName: row.courierName || '',
    courierNumber: row.courierNumber || '',
    vehicleNumber: row.vehicleNumber || '',
    challanNumber: row.challanNumber || '',
    dispatchDate: (row.shipmentDate || '').slice(0, 10),
    estimatedDelivery: (row.expectedDelivery || '').slice(0, 10),
    rolls: String(row.rolls || row.boxes || 0),
    weight: row.weight == null ? '0.00' : String(row.weight),
    notes: row.notes || '',
    millName: row.millName || '',
    consigneeName: row.consigneeName || '',
    customerCity: row.customerCity || '',
    invoiceNumber: row.invoiceNumber || '',
    invoiceDate: (row.invoiceDate || '').slice(0, 10),
    division: row.division || '',
    lrNo: row.lrNo || '',
    lrDate: (row.lrDate || '').slice(0, 10),
    cartons: (row.cartons || []).map(cartonFromSaved),
    files: [],
    savedFiles: (row.files || []).map((file) => ({
      url: file.url,
      key: file.key,
      originalName: file.originalName || 'File',
      mimeType: file.mimeType,
      size: file.size,
    })),
  };
}

/** Qty × rate across the purchase order lines. */
export function orderAmount(lines: PurchaseOrderLine[] = []): number {
  return lines.reduce((sum, line) => sum + (line.quantity || 0) * (line.rate || 0), 0);
}

/** Label shown in the PO-line picker. */
export function lineLabel(line: PurchaseOrderLine): string {
  return (
    [line.fabricName, line.fabricSortNo, line.fabricTypeName, line.colourName, line.unitName].filter(Boolean).join(' · ') ||
    line.lineId
  );
}

/**
 * Returns the first problem on a packlist row, or an empty string.
 * A selected line whose cutoff is not approved is rejected.
 */
export function transitEntryError(
  entry: TransitPackEntry,
  index: number,
  lines: PurchaseOrderLine[] = [],
  approvedKeys?: Set<string>
): string {
  const label = `Packlist entry ${index + 1}`;
  if (!entry.lineIds.length) return `${label}: select at least one PO line`;
  if (approvedKeys) {
    const blocked = entry.lineIds.some((id) => {
      const line = lines.find((row) => row.lineId === id);
      return !line || !approvedKeys.has(cutoffKey(line));
    });
    if (blocked) return `${label}: cutoff is not approved`;
  }
  if (!entry.packingNumber.trim()) return `${label}: packing number is required`;
  if (!entry.courierName.trim()) return `${label}: courier is required`;
  if (!entry.dispatchDate) return `${label}: dispatch date is required`;
  if (!entry.estimatedDelivery) return `${label}: estimated delivery is required`;
  if (!(Number(entry.rolls) > 0)) return `${label}: rolls must be greater than 0`;
  if (!(Number(entry.weight) > 0)) {
    return entry.cartons.length
      ? `${label}: enter a gross weight on the carton rows`
      : `${label}: weight must be greater than 0`;
  }
  return '';
}
