import { API_BASE_URL } from '@/shared/data/utilities/api';
import { setupCatalogAuth } from '@/shared/utils/setupAxiosAuth';

export interface PageResult<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface PurchaseOrderLine {
  lineId: string;
  fabricId?: string;
  fabricName?: string;
  fabricTypeName?: string;
  colourName?: string;
  quantity: number;
  unitId?: string;
  unitName?: string;
  rate?: number;
  gstPercent?: number;
  estimatedDelivery?: string;
}

export interface ReceivedLotLine {
  lineId: string;
  receivedQuantity: number;
}

export interface ReceivedLot {
  lotNumber: string;
  rolls: number;
  grossWeight: number;
  netWeight: number;
  lines: ReceivedLotLine[];
  qcStatus?: 'pending' | 'passed' | 'held' | 'rejected';
  qcBy?: string;
  qcAt?: string | null;
  qcRemarks?: string;
}

export interface StatusHistoryRow {
  status: string;
  userName?: string;
  at?: string;
  remarks?: string;
}

export interface PurchaseOrderRow {
  id: string;
  number: string;
  supplierName: string;
  supplierAddress?: string;
  supplierTerms?: string;
  status: string;
  purchaseDate?: string;
  creditDays?: number;
  estimatedDelivery?: string;
  notes?: string;
  lines: PurchaseOrderLine[];
  receivedLots?: ReceivedLot[];
  statusHistory?: StatusHistoryRow[];
  receivedQuantity?: number;
  goodsReceivedQuantity?: number;
}

export interface LotCutoff {
  fabricId: string;
  approved: boolean;
}

export interface LotRow {
  id: string;
  poId: string;
  status: string;
  qcStatus: string;
  cutoffs: LotCutoff[];
}

export interface ReceiptRow {
  id: string;
  number: string;
  lotId: string;
  poId: string;
  supplierName?: string;
  netWeight?: number;
  grossWeight?: number;
  rollCount?: number;
  receiver?: string;
  receivedDate?: string;
  condition?: string;
  notes?: string;
  supplierAddress?: string;
}

export interface RollRow {
  id: string;
  barcode: string;
  lotId: string;
  status: string;
  scaleWeight: number;
  poId?: string;
  grnId?: string;
  lineId?: string;
  fabricName?: string;
  colourName?: string;
  receivedLotNumber?: string;
  rollCode?: string;
  grossWeight?: number;
  netWeight?: number;
  receivedDate?: string | null;
  qcStatus?: 'pending' | 'passed' | 'rejected' | 'held';
  poNumber?: string;
  rackCode?: string;
  lastUser?: string;
  lastAt?: string;
}

export interface OrderLogRow {
  id: string;
  action: string;
  userId: string;
  userName: string;
  entityType: string;
  entityCode: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  remarks: string;
  at: string;
  orderId?: string;
}

export interface OrderDetail {
  order: ProductionOrderRow;
  completions: { id: string; stage: string; qty: number; operatorId?: string; machineBarcode?: string }[];
  bundles: BundleRow[];
}

export interface VendorReturnRow {
  id: string;
  poId: string;
  grnId: string;
  reason: string;
  rollBarcodes: string[];
  lotNumbers?: string[];
  quantity?: number;
  weight?: number;
  challanNumber?: string;
  poNumber?: string;
  supplierName?: string;
  remarks?: string;
  issuedAt?: string;
}

export interface FloorStep {
  processId?: string;
  name: string;
  floor: string;
  sortOrder: number;
  receivedQty?: number;
  completedQty: number;
  transferredQty?: number;
}

export interface ProductionOrderRow {
  id: string;
  itemId?: string;
  productionType: string;
  revisionId: string;
  targetQty: number;
  status: string;
  priority?: string;
  orderNote?: string;
  currentFloor?: string;
  floors?: FloorStep[];
  segments: { revisionId: string; qty: number; completedQty: number }[];
}

export interface BundleRow {
  id: string;
  number: number;
  qty: number;
  closed: boolean;
  barcode?: string;
  fromFloor?: string;
  toFloor?: string;
  status?: string;
}

export interface ClientRow {
  id: string;
  name: string;
  address: string;
}

export interface ClientOrderRow {
  id: string;
  clientName: string;
  clientAddress: string;
  status: string;
  targetBoxes: number;
}

export interface PackingBundleRow {
  id: string;
  barcode: string;
  orderId?: string;
  qty: number;
  onPackingRack: boolean;
}

export interface BoxRow {
  id: string;
  barcode: string;
  status: string;
  scaleWeight: number;
  rackCode?: string;
  clientAddress?: string;
  productionOrderId?: string;
}

export interface InvoiceRow {
  id: string;
  number: string;
  boxId: string;
  clientAddress?: string;
  lines: { pieceCount: number; hsn?: string; gst?: string }[];
}

export interface GradeRow {
  code: string;
  name: string;
}

/**
 * Authenticated JSON call. Throws with the API message when the status is not ok.
 */
export async function factoryRequest<T>(path: string, init?: RequestInit): Promise<T> {
  setupCatalogAuth();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || `Request failed (${response.status})`);
  }
  return payload as T;
}

/**
 * @param path API path beginning with /
 */
export function factoryPage<T>(path: string, page: number, limit: number, search: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search.trim()) params.set('search', search.trim());
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return factoryRequest<PageResult<T>>(`${path}?${params.toString()}`);
}

export interface ScopeRevision {
  id: string;
  sequence: number;
  reason?: string;
}

/**
 * Floor route stored on an item. internal and outsourced are not floor routes.
 */
export function routeFromItem(productionType?: string): 'normal' | 'embroidery' | 'sticker' {
  if (productionType === 'embroidery' || productionType === 'sticker') return productionType;
  return 'normal';
}

/**
 * Scope id item save already publishes: style plus route.
 */
export function itemScopeId(product: {
  id?: string;
  _id?: string;
  productionType?: string;
  styleCodes?: unknown;
}): string {
  const productId = product.id || product._id || '';
  let styleId = productId;
  if (Array.isArray(product.styleCodes) && product.styleCodes.length) {
    const first = product.styleCodes[0] as string | { id?: string; _id?: string };
    if (typeof first === 'string') styleId = first;
    else styleId = first?.id || first?._id || productId;
  }
  return `style:${styleId}:route:${routeFromItem(product.productionType)}`;
}

/**
 * Published revisions for a style and route.
 */
export function listScopeRevisions(scopeId: string) {
  return factoryRequest<{ results: ScopeRevision[] }>(`/versioning/scopes/${encodeURIComponent(scopeId)}/revisions`);
}

/** Stable id for a PO line so commercials can target it after save. */
export function newLineId(): string {
  return `ln-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
