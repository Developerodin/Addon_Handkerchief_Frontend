import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface ThreadCatalog {
  id: string;
  threadCode: string;
  threadType: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface ThreadCatalogListResponse {
  results: ThreadCatalog[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ThreadCatalogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  threadCode?: string;
  threadType?: string;
  status?: 'active' | 'inactive' | string;
}

export type CreateThreadCatalogPayload = Omit<ThreadCatalog, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateThreadCatalogPayload = Partial<CreateThreadCatalogPayload>;

const BASE = `${API_BASE_URL}/thread-catalogs`;

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
 * Normalizes a catalog row so `id` is always a string.
 * @param row - Raw API document
 */
function normalizeThread(row: Record<string, unknown>): ThreadCatalog {
  return {
    ...(row as unknown as ThreadCatalog),
    id: String(row.id ?? row._id ?? ''),
  };
}

/**
 * Reads an id from a string or a populated catalog document.
 * @param value - Raw id or populated object
 */
export const getThreadCatalogId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { id?: string; _id?: string };
    return String(obj.id ?? obj._id ?? '');
  }
  return '';
};

/**
 * Lists thread catalog rows.
 * @param params - Page, search, and status filters
 */
export async function listThreadCatalogs(
  params: ThreadCatalogQueryParams = {}
): Promise<ThreadCatalogListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.threadCode) searchParams.set('threadCode', params.threadCode);
  if (params.threadType) searchParams.set('threadType', params.threadType);
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const response = await fetch(`${BASE}${query ? `?${query}` : ''}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) await parseError(response, 'Failed to fetch thread catalogs');

  const data = await response.json();
  const results = (Array.isArray(data.results) ? data.results : []).map(normalizeThread);
  return {
    results,
    page: data.page ?? params.page ?? 1,
    limit: data.limit ?? params.limit ?? results.length,
    totalPages: data.totalPages ?? 1,
    totalResults: data.totalResults ?? results.length,
  };
}

/**
 * Loads one thread catalog row.
 * @param id - Catalog id
 */
export async function getThreadCatalog(id: string): Promise<ThreadCatalog> {
  if (!id) throw new Error('Thread catalog id is required');
  const response = await fetch(`${BASE}/${id}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) await parseError(response, 'Failed to fetch thread catalog');
  return normalizeThread(await response.json());
}

/**
 * Creates a thread catalog row.
 * @param payload - Thread code, type, and status
 */
export async function createThreadCatalog(payload: CreateThreadCatalogPayload): Promise<ThreadCatalog> {
  const response = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to create thread catalog');
  return normalizeThread(await response.json());
}

/**
 * Updates a thread catalog row.
 * @param id - Catalog id
 * @param payload - Fields to change
 */
export async function updateThreadCatalog(
  id: string,
  payload: UpdateThreadCatalogPayload
): Promise<ThreadCatalog> {
  if (!id) throw new Error('Thread catalog id is required');
  const response = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to update thread catalog');
  return normalizeThread(await response.json());
}

/**
 * Deletes a thread catalog row.
 * @param id - Catalog id
 */
export async function deleteThreadCatalog(id: string): Promise<void> {
  if (!id) throw new Error('Thread catalog id is required');
  const response = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!response.ok) await parseError(response, 'Failed to delete thread catalog');
}
