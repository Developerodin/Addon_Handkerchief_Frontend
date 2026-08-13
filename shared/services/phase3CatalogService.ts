import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CatalogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  status?: string;
}

type IdRow = { id: string; _id?: string };

async function parseError(response: Response, fallback: string): Promise<never> {
  const err = await response.json().catch(() => ({} as { message?: string }));
  throw new Error(err.message || fallback);
}

function normalizeId<T extends IdRow>(row: Record<string, unknown>): T {
  return {
    ...(row as unknown as T),
    id: String(row.id ?? row._id ?? ''),
  };
}

function createCatalogApi<T extends IdRow>(resourcePath: string) {
  const BASE = `${API_BASE_URL}${resourcePath}`;

  const list = async (params: CatalogQueryParams = {}): Promise<PaginatedResponse<T>> => {
    const searchParams = new URLSearchParams();
    if (params.page != null) searchParams.set('page', String(params.page));
    if (params.limit != null) searchParams.set('limit', String(params.limit));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const response = await fetch(`${BASE}${query ? `?${query}` : ''}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) await parseError(response, `Failed to fetch ${resourcePath}`);
    const data = await response.json();
    const results = (Array.isArray(data.results) ? data.results : []).map((row: Record<string, unknown>) =>
      normalizeId<T>(row)
    );
    return {
      results,
      page: data.page ?? params.page ?? 1,
      limit: data.limit ?? params.limit ?? results.length,
      totalPages: data.totalPages ?? 1,
      totalResults: data.totalResults ?? results.length,
    };
  };

  const get = async (id: string): Promise<T> => {
    if (!id) throw new Error('Id is required');
    const response = await fetch(`${BASE}/${id}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) await parseError(response, `Failed to fetch ${resourcePath}`);
    return normalizeId<T>(await response.json());
  };

  const create = async (payload: Partial<T>): Promise<T> => {
    const response = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await parseError(response, `Failed to create ${resourcePath}`);
    return normalizeId<T>(await response.json());
  };

  const update = async (id: string, payload: Partial<T>): Promise<T> => {
    if (!id) throw new Error('Id is required');
    const response = await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await parseError(response, `Failed to update ${resourcePath}`);
    return normalizeId<T>(await response.json());
  };

  const remove = async (id: string): Promise<void> => {
    if (!id) throw new Error('Id is required');
    const response = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!response.ok) await parseError(response, `Failed to delete ${resourcePath}`);
  };

  return { list, get, create, update, remove };
}

export interface UserRef {
  id: string;
  name?: string;
  email?: string;
}

export interface Machine {
  id: string;
  name: string;
  code?: string;
  machineType?: string;
  makeModel?: string;
  department?: string;
  floor?: string;
  capacityPerShift?: number;
  maintenanceIntervalMonths?: number;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
  maintenanceNotes?: string;
  assignedSupervisor?: string | UserRef | null;
  status?: 'active' | 'inactive';
}

export interface Worker {
  id: string;
  name: string;
  employeeCode: string;
  department?: string;
  supervisor?: string | UserRef | null;
  skill?: string;
  shift?: string;
  contactNumber?: string;
  barcode?: string;
  joinDate?: string | null;
  status?: 'active' | 'inactive';
}

export interface StorageRack {
  id: string;
  code: string;
  name: string;
  floor?: string;
  zone?: string;
  stockType?: 'fabric' | 'wip-bundle' | 'finished-carton';
  capacity?: number;
  barcode?: string;
  status?: 'active' | 'inactive';
}

export interface Container {
  id: string;
  code: string;
  name: string;
  type?: 'bundle' | 'carton' | 'trolley' | 'crate';
  capacity?: number;
  barcode?: string;
  department?: string;
  floor?: string;
  reusable?: boolean;
  status?: 'active' | 'inactive';
}

export interface DeviceRegistry {
  id: string;
  name: string;
  deviceType: 'printer' | 'scanner';
  model?: string;
  location?: string;
  labelSize?: string;
  scannerType?: 'handheld' | 'fixed' | '';
  status?: 'active' | 'inactive';
}

export interface LabelTemplate {
  id: string;
  name: string;
  labelType: 'fabric-roll' | 'bundle-sticker' | 'carton' | 'style-ean';
  size?: string;
  encodedFields?: string[];
  barcodeScheme?: string;
  printerDevice?: string | DeviceRegistry | null;
  status?: 'active' | 'inactive';
}

const machineApi = createCatalogApi<Machine>('/machines');
const workerApi = createCatalogApi<Worker>('/workers');
const storageRackApi = createCatalogApi<StorageRack>('/storage-racks');
const containerApi = createCatalogApi<Container>('/containers');
const labelTemplateApi = createCatalogApi<LabelTemplate>('/label-templates');
const deviceRegistryApi = createCatalogApi<DeviceRegistry>('/device-registry');

export const listMachines = machineApi.list;
export const getMachine = machineApi.get;
export const createMachine = machineApi.create;
export const updateMachine = machineApi.update;
export const deleteMachine = machineApi.remove;

export const listWorkers = workerApi.list;
export const getWorker = workerApi.get;
export const createWorker = workerApi.create;
export const updateWorker = workerApi.update;
export const deleteWorker = workerApi.remove;

export const listStorageRacks = storageRackApi.list;
export const getStorageRack = storageRackApi.get;
export const createStorageRack = storageRackApi.create;
export const updateStorageRack = storageRackApi.update;
export const deleteStorageRack = storageRackApi.remove;

export const listContainers = containerApi.list;
export const getContainer = containerApi.get;
export const createContainer = containerApi.create;
export const updateContainer = containerApi.update;
export const deleteContainer = containerApi.remove;

export const listLabelTemplates = labelTemplateApi.list;
export const getLabelTemplate = labelTemplateApi.get;
export const createLabelTemplate = labelTemplateApi.create;
export const updateLabelTemplate = labelTemplateApi.update;
export const deleteLabelTemplate = labelTemplateApi.remove;

export const listDeviceRegistries = deviceRegistryApi.list;
export const getDeviceRegistry = deviceRegistryApi.get;
export const createDeviceRegistry = deviceRegistryApi.create;
export const updateDeviceRegistry = deviceRegistryApi.update;
export const deleteDeviceRegistry = deviceRegistryApi.remove;

export const getUserDisplay = (ref?: string | UserRef | null): string => {
  if (!ref) return '—';
  if (typeof ref === 'object' && ref.name) return ref.name;
  return String(ref);
};

export const getDeviceDisplay = (ref?: string | DeviceRegistry | null): string => {
  if (!ref) return '—';
  if (typeof ref === 'object' && ref.name) return ref.name;
  return String(ref);
};
