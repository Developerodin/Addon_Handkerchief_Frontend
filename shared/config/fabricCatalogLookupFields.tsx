import {
  FabricColorLookup,
  FabricCountLookup,
  FabricMeasurementLookup,
  FabricQualityLookup,
  FabricTypeLookup,
  FabricYarnLookup,
  formatFabricQualityLabel,
} from '@/shared/services/fabricLookupService';
import { CatalogLookupColumn } from '@/shared/components/catalog/CatalogLookupSelectModal';
import { FABRIC_WEAVE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';

export interface FabricWeaveOption {
  id: string;
  name: string;
}

export const fabricWeaveItems: FabricWeaveOption[] = FABRIC_WEAVE_OPTIONS.map((option) => ({
  id: option.value,
  name: option.label,
}));

const nameColumn = <T extends { name?: string }>(): CatalogLookupColumn<T>[] => [
  { key: 'name', label: 'Name', render: (item) => item.name || '—' },
];

const nameFilter = <T extends { name?: string }>(item: T, search: string) =>
  String(item.name ?? '')
    .toLowerCase()
    .includes(search.trim().toLowerCase());

export const fabricCatalogLookupFields = {
  fabricType: {
    modalTitle: 'Select Fabric Type',
    searchPlaceholder: 'Search fabric type...',
    columns: nameColumn<FabricTypeLookup>(),
    getItemId: (item: FabricTypeLookup) => item.id,
    getItemLabel: (item: FabricTypeLookup) => item.name,
    filterItem: nameFilter<FabricTypeLookup>,
  },
  color: {
    modalTitle: 'Select Fabric Color',
    searchPlaceholder: 'Search color...',
    columns: [
      { key: 'name', label: 'Name', render: (item: FabricColorLookup) => item.name },
      { key: 'colorCode', label: 'Color Code', render: (item: FabricColorLookup) => item.colorCode || '—' },
    ] as CatalogLookupColumn<FabricColorLookup>[],
    getItemId: (item: FabricColorLookup) => item.id,
    getItemLabel: (item: FabricColorLookup) => item.name,
    filterItem: (item: FabricColorLookup, search: string) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [item.name, item.colorCode].some((value) => String(value ?? '').toLowerCase().includes(query));
    },
  },
  quality: {
    modalTitle: 'Select Fabric Quality',
    searchPlaceholder: 'Search quality...',
    columns: [
      { key: 'name', label: 'Name', render: (item: FabricQualityLookup) => item.name },
      {
        key: 'composition',
        label: 'Composition',
        render: (item: FabricQualityLookup) => item.composition || '—',
      },
    ] as CatalogLookupColumn<FabricQualityLookup>[],
    getItemId: (item: FabricQualityLookup) => item.id,
    getItemLabel: (item: FabricQualityLookup) => formatFabricQualityLabel(item),
    filterItem: (item: FabricQualityLookup, search: string) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [item.name, item.composition, item.grade].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      );
    },
  },
  yarn: {
    modalTitle: 'Select Yarn',
    searchPlaceholder: 'Search yarn...',
    columns: nameColumn<FabricYarnLookup>(),
    getItemId: (item: FabricYarnLookup) => item.id,
    getItemLabel: (item: FabricYarnLookup) => item.name,
    filterItem: nameFilter<FabricYarnLookup>,
  },
  count: {
    modalTitle: 'Select Count',
    searchPlaceholder: 'Search count...',
    columns: nameColumn<FabricCountLookup>(),
    getItemId: (item: FabricCountLookup) => item.id,
    getItemLabel: (item: FabricCountLookup) => item.name,
    filterItem: nameFilter<FabricCountLookup>,
  },
  measurement: {
    modalTitle: 'Select Measurement',
    searchPlaceholder: 'Search measurement...',
    columns: [
      { key: 'name', label: 'Name', render: (item: FabricMeasurementLookup) => item.name },
      { key: 'symbol', label: 'Symbol', render: (item: FabricMeasurementLookup) => item.symbol || '—' },
      { key: 'category', label: 'Category', render: (item: FabricMeasurementLookup) => item.category },
    ] as CatalogLookupColumn<FabricMeasurementLookup>[],
    getItemId: (item: FabricMeasurementLookup) => item.id,
    getItemLabel: (item: FabricMeasurementLookup) =>
      `${item.name}${item.symbol ? ` (${item.symbol})` : ''}`,
    filterItem: (item: FabricMeasurementLookup, search: string) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [item.name, item.symbol, item.category].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      );
    },
  },
  weave: {
    modalTitle: 'Select Weave',
    searchPlaceholder: 'Search weave...',
    columns: nameColumn<FabricWeaveOption>(),
    getItemId: (item: FabricWeaveOption) => item.id,
    getItemLabel: (item: FabricWeaveOption) => item.name,
    filterItem: nameFilter<FabricWeaveOption>,
  },
};
