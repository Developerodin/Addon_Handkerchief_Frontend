import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface FabricCatalog {
  id: string;
  name: string;
  code?: string;
  fabricType?: string;
  composition?: string;
  gsm?: number;
  width?: number;
  colour?: string;
  shade?: string;
  pantone?: string;
  design?: string;
  rate?: number;
  gst?: string;
  hsnCode?: string;
  minQuantity?: number;
  supplier?: string | { id: string; name?: string } | null;
  supplierName?: string;
  uomRolls?: boolean;
  uomKg?: boolean;
  uomMetres?: boolean;
  status?: 'active' | 'inactive';
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FabricCatalogListResponse {
  results: FabricCatalog[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface FabricCatalogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  name?: string;
  code?: string;
  fabricType?: string;
  colour?: string;
  status?: 'active' | 'inactive' | string;
  supplier?: string;
}

export type CreateFabricCatalogPayload = Omit<
  FabricCatalog,
  'id' | 'createdAt' | 'updatedAt'
>;

export type UpdateFabricCatalogPayload = Partial<CreateFabricCatalogPayload>;

const BASE = `${API_BASE_URL}/fabric-catalogs`;

async function parseError(response: Response, fallback: string): Promise<never> {
  const err = await response.json().catch(() => ({} as { message?: string }));
  throw new Error(err.message || fallback);
}

function normalizeFabric(row: Record<string, unknown>): FabricCatalog {
  return {
    ...(row as unknown as FabricCatalog),
    id: String(row.id ?? row._id ?? ''),
  };
}

export async function listFabricCatalogs(
  params: FabricCatalogQueryParams = {}
): Promise<FabricCatalogListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.name) searchParams.set('name', params.name);
  if (params.code) searchParams.set('code', params.code);
  if (params.fabricType) searchParams.set('fabricType', params.fabricType);
  if (params.colour) searchParams.set('colour', params.colour);
  if (params.status) searchParams.set('status', params.status);
  if (params.supplier) searchParams.set('supplier', params.supplier);

  const query = searchParams.toString();
  const response = await fetch(`${BASE}${query ? `?${query}` : ''}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) await parseError(response, 'Failed to fetch fabric catalogs');

  const data = await response.json();
  const results = (Array.isArray(data.results) ? data.results : []).map(normalizeFabric);
  return {
    results,
    page: data.page ?? params.page ?? 1,
    limit: data.limit ?? params.limit ?? results.length,
    totalPages: data.totalPages ?? 1,
    totalResults: data.totalResults ?? results.length,
  };
}

export async function getFabricCatalog(id: string): Promise<FabricCatalog> {
  if (!id) throw new Error('Fabric catalog id is required');
  const response = await fetch(`${BASE}/${id}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) await parseError(response, 'Failed to fetch fabric catalog');
  return normalizeFabric(await response.json());
}

export async function createFabricCatalog(
  payload: CreateFabricCatalogPayload
): Promise<FabricCatalog> {
  const response = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to create fabric catalog');
  return normalizeFabric(await response.json());
}

export async function updateFabricCatalog(
  id: string,
  payload: UpdateFabricCatalogPayload
): Promise<FabricCatalog> {
  if (!id) throw new Error('Fabric catalog id is required');
  const response = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to update fabric catalog');
  return normalizeFabric(await response.json());
}

export async function deleteFabricCatalog(id: string): Promise<void> {
  if (!id) throw new Error('Fabric catalog id is required');
  const response = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!response.ok) await parseError(response, 'Failed to delete fabric catalog');
}

const fabricCatalogService = {
  list: listFabricCatalogs,
  get: getFabricCatalog,
  create: createFabricCatalog,
  update: updateFabricCatalog,
  delete: deleteFabricCatalog,
  /** Alias matching yarnCatalogService naming used by Items pages */
  getFabricCatalogs: listFabricCatalogs,
};

export default fabricCatalogService;
