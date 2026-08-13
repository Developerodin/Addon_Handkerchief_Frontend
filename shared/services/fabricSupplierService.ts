import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface FabricSupplierBankDetails {
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifsc?: string;
}

export interface FabricSupplier {
  id: string;
  name: string;
  code?: string;
  contactPerson: string;
  contactNumber?: string;
  email?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstin?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  bankDetails?: FabricSupplierBankDetails;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface FabricSupplierListResponse {
  results: FabricSupplier[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface FabricSupplierQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  name?: string;
  code?: string;
  status?: 'active' | 'inactive';
}

export type CreateFabricSupplierPayload = Omit<
  FabricSupplier,
  'id' | 'createdAt' | 'updatedAt'
>;

export type UpdateFabricSupplierPayload = Partial<CreateFabricSupplierPayload>;

const BASE = `${API_BASE_URL}/fabric-suppliers`;

async function parseError(response: Response, fallback: string): Promise<never> {
  const err = await response.json().catch(() => ({} as { message?: string }));
  throw new Error(err.message || fallback);
}

export async function listFabricSuppliers(
  params: FabricSupplierQueryParams = {}
): Promise<FabricSupplierListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.name) searchParams.set('name', params.name);
  if (params.code) searchParams.set('code', params.code);
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const response = await fetch(`${BASE}${query ? `?${query}` : ''}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) await parseError(response, 'Failed to fetch fabric suppliers');

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    results,
    page: data.page ?? params.page ?? 1,
    limit: data.limit ?? params.limit ?? results.length,
    totalPages: data.totalPages ?? 1,
    totalResults: data.totalResults ?? results.length,
  };
}

export async function getFabricSupplier(id: string): Promise<FabricSupplier> {
  if (!id) throw new Error('Supplier id is required');
  const response = await fetch(`${BASE}/${id}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) await parseError(response, 'Failed to fetch fabric supplier');
  return response.json();
}

export async function createFabricSupplier(
  payload: CreateFabricSupplierPayload
): Promise<FabricSupplier> {
  const response = await fetch(BASE, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to create fabric supplier');
  return response.json();
}

export async function updateFabricSupplier(
  id: string,
  payload: UpdateFabricSupplierPayload
): Promise<FabricSupplier> {
  if (!id) throw new Error('Supplier id is required');
  const response = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to update fabric supplier');
  return response.json();
}

export async function deleteFabricSupplier(id: string): Promise<void> {
  if (!id) throw new Error('Supplier id is required');
  const response = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) await parseError(response, 'Failed to delete fabric supplier');
}

export const fabricSupplierService = {
  list: listFabricSuppliers,
  get: getFabricSupplier,
  create: createFabricSupplier,
  update: updateFabricSupplier,
  delete: deleteFabricSupplier,
};
