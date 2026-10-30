import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface ThreadSupplierBankDetails {
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifsc?: string;
}

export interface ThreadSupplierThreadDetail {
  threadCatalogId: string;
  threadCode?: string;
  threadType?: string;
}

export interface ThreadSupplier {
  id: string;
  name: string;
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
  threadDetails?: ThreadSupplierThreadDetail[];
  bankDetails?: ThreadSupplierBankDetails;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface ThreadSupplierListResponse {
  results: ThreadSupplier[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ThreadSupplierQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  name?: string;
  status?: 'active' | 'inactive';
}

export type CreateThreadSupplierPayload = Omit<ThreadSupplier, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateThreadSupplierPayload = Partial<CreateThreadSupplierPayload>;

const BASE = `${API_BASE_URL}/thread-suppliers`;

/**
 * Reads an API error body and throws its message.
 * @param response - Failed fetch response
 * @param fallback - Message used when the body has none
 */
async function parseError(response: Response, fallback: string): Promise<never> {
  const err = await response.json().catch(() => ({} as { message?: string }));
  throw new Error(err.message || fallback);
}

/**
 * Lists thread suppliers.
 * @param params - Page, search, and status filters
 */
export async function listThreadSuppliers(
  params: ThreadSupplierQueryParams = {}
): Promise<ThreadSupplierListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.name) searchParams.set('name', params.name);
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const response = await fetch(`${BASE}${query ? `?${query}` : ''}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) await parseError(response, 'Failed to fetch thread suppliers');

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

/**
 * Loads one thread supplier.
 * @param id - Supplier id
 */
export async function getThreadSupplier(id: string): Promise<ThreadSupplier> {
  if (!id) throw new Error('Supplier id is required');
  const response = await fetch(`${BASE}/${id}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) await parseError(response, 'Failed to fetch thread supplier');
  return response.json();
}

/**
 * Creates a thread supplier.
 * @param payload - Supplier header and thread detail ids
 */
export async function createThreadSupplier(payload: CreateThreadSupplierPayload): Promise<ThreadSupplier> {
  const response = await fetch(BASE, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to create thread supplier');
  return response.json();
}

/**
 * Updates a thread supplier.
 * @param id - Supplier id
 * @param payload - Fields to change
 */
export async function updateThreadSupplier(
  id: string,
  payload: UpdateThreadSupplierPayload
): Promise<ThreadSupplier> {
  if (!id) throw new Error('Supplier id is required');
  const response = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to update thread supplier');
  return response.json();
}

/**
 * Deletes a thread supplier.
 * @param id - Supplier id
 */
export async function deleteThreadSupplier(id: string): Promise<void> {
  if (!id) throw new Error('Supplier id is required');
  const response = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) await parseError(response, 'Failed to delete thread supplier');
}
