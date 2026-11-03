import { factoryRequest, PageResult } from '@/shared/services/factoryApi';

export type FabricAnalyticsSort =
  | 'fabricName'
  | 'inventoryMeters'
  | 'inOrderMeters'
  | 'draftMeters'
  | 'draftPoCount'
  | 'unallocatedMeters'
  | 'onRackMeters';

export interface FabricAnalyticsQuery {
  page: number;
  limit: number;
  search: string;
  sortBy: FabricAnalyticsSort;
  sortOrder: 'asc' | 'desc';
}

export interface FabricRack {
  code: string;
  meters: number;
}

export interface FabricAnalyticsRow {
  fabricId: string;
  fabricName: string;
  colourName: string;
  fabricSortNo: string;
  inventoryMeters: number;
  inOrderMeters: number;
  draftMeters: number;
  draftPoCount: number;
  unallocatedMeters: number;
  onRackMeters: number;
  racks: FabricRack[];
}

export interface FabricAnalyticsSummary {
  fabricCount: number;
  inventoryMeters: number;
  inOrderMeters: number;
  draftMeters: number;
  draftPoCount: number;
  unallocatedMeters: number;
  onRackMeters: number;
}

export interface FabricAnalyticsReport extends PageResult<FabricAnalyticsRow> {
  summary: FabricAnalyticsSummary;
}

/**
 * Query string for the fabric analytics list. Empty search is omitted.
 * @param query - Table filters
 */
export function fabricAnalyticsQueryString(query: FabricAnalyticsQuery): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  params.set('sortBy', query.sortBy);
  params.set('sortOrder', query.sortOrder);
  if (query.search.trim()) params.set('search', query.search.trim());
  return params.toString();
}

/**
 * Loads one page of fabric analytics and the totals for the current search.
 * @param query - Table filters
 */
export function loadFabricAnalytics(query: FabricAnalyticsQuery): Promise<FabricAnalyticsReport> {
  return factoryRequest<FabricAnalyticsReport>(`/store/reports/fabric?${fabricAnalyticsQueryString(query)}`);
}
