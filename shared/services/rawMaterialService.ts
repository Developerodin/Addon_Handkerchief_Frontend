import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface RawMaterial {
  id: string;
  name: string;
  type: string;
  sizeSpec?: string;
  unit: string;
  supplier?: string | { id: string; name: string } | null;
  supplierName?: string;
  rate?: number;
  hsnCode?: string;
  gst?: string;
  minimumStock?: number;
  description?: string;
  status?: 'active' | 'inactive';
  image?: string | null;
  // Legacy optional fields
  groupName?: string;
  brand?: string;
  countSize?: string;
  material?: string;
  color?: string;
  shade?: string;
  mrp?: string;
  articleNo?: string;
}

export interface RawMaterialListResponse {
  results: RawMaterial[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Fetch packaging materials (API: /raw-materials) with pagination and optional search.
 */
export async function listRawMaterialsPaginated(options: {
  page: number;
  limit: number;
  search?: string;
}): Promise<RawMaterialListResponse> {
  const { page, limit, search } = options;
  const searchParam = search?.trim() ? `&search=${encodeURIComponent(search)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/raw-materials?page=${page}&limit=${limit}${searchParam}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch packaging materials');
  }
  const data: RawMaterialListResponse = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    results,
    page: data.page ?? page,
    limit: data.limit ?? limit,
    totalPages: data.totalPages ?? 1,
    totalResults: data.totalResults ?? results.length,
  };
}

/** Fetch all packaging materials (no pagination - for dropdowns). */
export async function listRawMaterials(options?: { search?: string }): Promise<RawMaterial[]> {
  const res = await listRawMaterialsPaginated({ page: 1, limit: 10000, search: options?.search });
  return res.results;
}

export const rawMaterialService = {
  list: listRawMaterials,
  listPaginated: listRawMaterialsPaginated,
};
