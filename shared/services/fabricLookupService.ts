import { API_BASE_URL } from '@/shared/data/utilities/api';

export type FabricLookupStatus = 'active' | 'inactive';

export interface FabricLookupListResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface FabricLookupQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  name?: string;
  status?: FabricLookupStatus | string;
  category?: string;
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const err = await response.json().catch(() => ({} as { message?: string }));
  throw new Error(err.message || fallback);
}

function normalizeRow<T extends { id?: string; _id?: string }>(row: T): T & { id: string } {
  return {
    ...row,
    id: String(row.id ?? row._id ?? ''),
  };
}

export function createFabricLookupApi<T extends { id?: string; _id?: string }>(
  basePath: string,
  entityLabel: string
) {
  const BASE = `${API_BASE_URL}${basePath}`;

  const list = async (params: FabricLookupQueryParams = {}): Promise<FabricLookupListResponse<T & { id: string }>> => {
    const searchParams = new URLSearchParams();
    if (params.page != null) searchParams.set('page', String(params.page));
    if (params.limit != null) searchParams.set('limit', String(params.limit));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.name) searchParams.set('name', params.name);
    if (params.status) searchParams.set('status', params.status);
    if (params.category) searchParams.set('category', params.category);

    const query = searchParams.toString();
    const response = await fetch(`${BASE}${query ? `?${query}` : ''}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) await parseError(response, `Failed to fetch ${entityLabel}`);

    const data = await response.json();
    const results = (Array.isArray(data.results) ? data.results : []).map((row: T) => normalizeRow(row));
    return {
      results,
      page: data.page ?? params.page ?? 1,
      limit: data.limit ?? params.limit ?? results.length,
      totalPages: data.totalPages ?? 1,
      totalResults: data.totalResults ?? results.length,
    };
  };

  const get = async (id: string): Promise<T & { id: string }> => {
    if (!id) throw new Error(`${entityLabel} id is required`);
    const response = await fetch(`${BASE}/${id}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) await parseError(response, `Failed to fetch ${entityLabel}`);
    return normalizeRow(await response.json());
  };

  const create = async (payload: Partial<T>): Promise<T & { id: string }> => {
    const response = await fetch(BASE, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await parseError(response, `Failed to create ${entityLabel}`);
    return normalizeRow(await response.json());
  };

  const update = async (id: string, payload: Partial<T>): Promise<T & { id: string }> => {
    if (!id) throw new Error(`${entityLabel} id is required`);
    const response = await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await parseError(response, `Failed to update ${entityLabel}`);
    return normalizeRow(await response.json());
  };

  const remove = async (id: string): Promise<void> => {
    if (!id) throw new Error(`${entityLabel} id is required`);
    const response = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!response.ok) await parseError(response, `Failed to delete ${entityLabel}`);
  };

  return { list, get, create, update, remove };
}

export interface FabricTypeLookup {
  id: string;
  name: string;
  status: FabricLookupStatus;
}

export interface FabricColorLookup {
  id: string;
  name: string;
  colorCode: string;
  pantone?: string;
  status: FabricLookupStatus;
}

export interface FabricQualityLookup {
  id: string;
  name: string;
  composition?: string;
  primaryFiber?: string;
  primaryFiberPercent?: number | null;
  secondaryFiber?: string;
  secondaryFiberPercent?: number | null;
  grade?: string;
  remarks?: string;
  status: FabricLookupStatus;
}

export interface FabricYarnCountLookup {
  id: string;
  name: string;
  status: FabricLookupStatus;
}

export type FabricMeasurementCategory = 'length' | 'weight' | 'quantity' | 'area';

export interface FabricMeasurementLookup {
  id: string;
  name: string;
  symbol?: string;
  category: FabricMeasurementCategory;
  status: FabricLookupStatus;
}

export const fabricTypeApi = createFabricLookupApi<FabricTypeLookup>('/fabric-types', 'fabric type');
export const fabricColorApi = createFabricLookupApi<FabricColorLookup>('/fabric-colors', 'fabric color');
export const fabricQualityApi = createFabricLookupApi<FabricQualityLookup>('/fabric-qualities', 'fabric quality');

export function formatFabricQualityLabel(quality: Pick<FabricQualityLookup, 'name' | 'composition'>): string {
  const name = String(quality.name ?? '').trim();
  const composition = String(quality.composition ?? '').trim();
  if (composition && composition !== name) {
    return `${name || '—'} (${composition})`;
  }
  return name || '—';
}

export const fabricYarnCountApi = createFabricLookupApi<FabricYarnCountLookup>(
  '/fabric-yarn-counts',
  'fabric yarn/count'
);
export const fabricMeasurementApi = createFabricLookupApi<FabricMeasurementLookup>(
  '/fabric-measurements',
  'fabric measurement'
);
