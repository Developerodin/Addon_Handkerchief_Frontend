'use client';

import { CatalogListPage } from '@/shared/components/catalog/CatalogListPage';
import type {
  CatalogListApi,
  CatalogListColumn,
  CatalogListConfig,
} from '@/shared/components/catalog/catalogListTypes';
import type { FabricLookupStatus } from '@/shared/services/fabricLookupService';

/** @deprecated Use CatalogListColumn from catalogListTypes */
export type FabricLookupColumn<T> = CatalogListColumn<T>;

/** @deprecated Use CatalogListConfig from catalogListTypes */
export type FabricLookupListConfig<T extends { id: string; name: string; status?: FabricLookupStatus }> =
  CatalogListConfig<T>;

/** Backward-compatible alias for config-driven fabric lookup list pages. */
export function FabricLookupListPage<T extends { id: string; name: string; status?: FabricLookupStatus }>({
  config,
}: {
  config: CatalogListConfig<T>;
}) {
  return <CatalogListPage config={config} />;
}

export type { CatalogListApi, CatalogListColumn, CatalogListConfig };
export { CatalogListPage };
export default FabricLookupListPage;
