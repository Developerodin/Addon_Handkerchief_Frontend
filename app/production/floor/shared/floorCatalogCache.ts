import {
  Container,
  listContainers,
  listMachines,
  listProductionRacks,
  Machine,
  ProductionRack,
} from '@/shared/services/phase3CatalogService';

const ACTIVE_QUERY = { page: 1, limit: 200, status: 'active' as const };
const TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = { at: number; value: Promise<T> };

let machinesCache: CacheEntry<Machine[]> | null = null;
let racksCache: CacheEntry<ProductionRack[]> | null = null;
let containersCache: CacheEntry<Container[]> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return Boolean(entry && Date.now() - entry.at < TTL_MS);
}

/** Active machines for floor drawers (deduped in-flight, short TTL). */
export function loadFloorMachines(): Promise<Machine[]> {
  if (isFresh(machinesCache)) return machinesCache.value;
  const value = listMachines(ACTIVE_QUERY)
    .then((page) => page.results || [])
    .catch((err) => {
      machinesCache = null;
      throw err;
    });
  machinesCache = { at: Date.now(), value };
  return value;
}

/** Active storage racks for floor drawers. */
export function loadFloorStorageRacks(): Promise<ProductionRack[]> {
  if (isFresh(racksCache)) return racksCache.value;
  const value = listProductionRacks(ACTIVE_QUERY)
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
  const value = listContainers(ACTIVE_QUERY)
    .then((page) => (page.results || []).filter((row) => row.type === 'bundle'))
    .catch((err) => {
      containersCache = null;
      throw err;
    });
  containersCache = { at: Date.now(), value };
  return value;
}