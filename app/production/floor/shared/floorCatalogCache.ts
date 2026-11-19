import {
  Container,
  CatalogQueryParams,
  listContainers,
  listMachines,
  listProductionRacks,
  Machine,
  ProductionRack,
} from '@/shared/services/phase3CatalogService';
import type { EquipmentRole } from '@/shared/constants/productionFloors';

const ACTIVE_BASE = { page: 1, limit: 200, status: 'active' as const };
const TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = { at: number; value: Promise<T> };

const machineCaches = new Map<string, CacheEntry<Machine[]>>();
let racksCache: CacheEntry<ProductionRack[]> | null = null;
let containersCache: CacheEntry<Container[]> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return Boolean(entry && Date.now() - entry.at < TTL_MS);
}

function machineCacheKey(floor: string, equipmentRole?: EquipmentRole): string {
  return `${floor}|${equipmentRole || '*'}`;
}

export interface FloorMachineQuery {
  floor: string;
  equipmentRole?: EquipmentRole;
}

/** Active machines for a floor drawer (deduped in-flight, short TTL). */
export function loadFloorMachines(query: FloorMachineQuery): Promise<Machine[]> {
  const params: CatalogQueryParams = {
    ...ACTIVE_BASE,
    floor: query.floor,
    ...(query.equipmentRole ? { equipmentRole: query.equipmentRole } : {}),
  };
  const key = machineCacheKey(query.floor, query.equipmentRole);
  const hit = machineCaches.get(key);
  if (isFresh(hit)) return hit.value;

  const value = listMachines(params)
    .then((page) => page.results || [])
    .catch((err) => {
      machineCaches.delete(key);
      throw err;
    });
  machineCaches.set(key, { at: Date.now(), value });
  return value;
}

/** Active storage racks for floor drawers. */
export function loadFloorStorageRacks(): Promise<ProductionRack[]> {
  if (isFresh(racksCache)) return racksCache.value;
  const value = listProductionRacks(ACTIVE_BASE)
    .then((page) => page.results || [])
    .catch((err) => {
      racksCache = null;
      throw err;
    });
  racksCache = { at: Date.now(), value };
  return value;
}

/** Active bundle-type containers for floor drawers. */
export function loadFloorBundleContainers(): Promise<Container[]> {
  if (isFresh(containersCache)) return containersCache.value;
  const value = listContainers(ACTIVE_BASE)
    .then((page) => (page.results || []).filter((row) => row.type === 'bundle'))
    .catch((err) => {
      containersCache = null;
      throw err;
    });
  containersCache = { at: Date.now(), value };
  return value;
}