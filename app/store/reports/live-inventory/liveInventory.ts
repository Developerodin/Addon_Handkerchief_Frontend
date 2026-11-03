import { API_BASE_URL } from '@/shared/data/utilities/api';
import { factoryRequest, PageResult } from '@/shared/services/factoryApi';
import { setupCatalogAuth } from '@/shared/utils/setupAxiosAuth';

export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export type LiveInventorySort =
  | 'fabricName'
  | 'onRackMeters'
  | 'qcPassedMeters'
  | 'unallocatedMeters'
  | 'rollCount'
  | 'issuedMeters'
  | 'availableMeters'
  | 'status';

export interface LiveInventoryQuery {
  page: number;
  limit: number;
  search: string;
  status: 'all' | InventoryStatus;
  sortBy: LiveInventorySort;
  sortOrder: 'asc' | 'desc';
}

export interface LiveInventoryRow {
  fabricId: string;
  fabricName: string;
  colourName: string;
  fabricSortNo: string;
  minQuantity: number;
  onRackMeters: number;
  qcPassedMeters: number;
  unallocatedMeters: number;
  rollCount: number;
  issuedMeters: number;
  heldMeters: number;
  availableMeters: number;
  status: InventoryStatus;
}

export interface LiveInventorySummary {
  skuCount: number;
  lowStockCount: number;
  onRackMeters: number;
  qcPassedMeters: number;
  unallocatedMeters: number;
  issuedMeters: number;
  heldMeters: number;
  availableMeters: number;
}

export interface LiveInventoryReport extends PageResult<LiveInventoryRow> {
  summary: LiveInventorySummary;
}

export interface UnallocatedRoll {
  id: string;
  barcode: string;
  lot: string;
  poNumber: string;
  meters: number;
  netKg: number;
}

/**
 * Query string for the live inventory list. Empty search is omitted.
 * @param query - Table filters plus an optional csv format flag
 */
export function liveInventoryQueryString(query: LiveInventoryQuery & { format?: 'csv' }): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  params.set('sortBy', query.sortBy);
  params.set('sortOrder', query.sortOrder);
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.status !== 'all') params.set('status', query.status);
  if (query.format) params.set('format', query.format);
  return params.toString();
}

/**
 * One page of fabric inventory plus the totals for the same filter.
 * @param query - Page, search, status, and sort
 */
export function loadLiveInventory(query: LiveInventoryQuery): Promise<LiveInventoryReport> {
  return factoryRequest<LiveInventoryReport>(`/store/reports/live-inventory?${liveInventoryQueryString(query)}`);
}

/**
 * Received rolls that have not been stored, for one fabric.
 * @param fabricId - Catalog id from the inventory row
 * @param page - Drawer page, 1-based
 */
export function loadUnallocatedRolls(fabricId: string, page: number): Promise<PageResult<UnallocatedRoll>> {
  const params = new URLSearchParams({
    fabricId,
    page: String(page),
    limit: '50',
  });
  return factoryRequest<PageResult<UnallocatedRoll>>(`/store/reports/live-inventory/unallocated?${params.toString()}`);
}

/**
 * Downloads the filtered inventory. The server caps the file at 5000 fabrics.
 * @param query - Same filters as the table
 */
export async function downloadLiveInventoryCsv(query: LiveInventoryQuery): Promise<void> {
  setupCatalogAuth();
  const response = await fetch(
    `${API_BASE_URL}/store/reports/live-inventory?${liveInventoryQueryString({ ...query, format: 'csv' })}`
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || `Export failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'live-inventory.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
