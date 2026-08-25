import {
  fabricTypeApi,
  fabricColorApi,
  fabricQualityApi,
  fabricYarnCountApi,
  fabricMeasurementApi,
  FabricColorLookup,
  FabricMeasurementLookup,
  FabricMeasurementCategory,
  FabricQualityLookup,
} from '@/shared/services/fabricLookupService';
import { FabricLookupListConfig } from '@/shared/components/catalog/FabricLookupListPage';
import {
  FabricLookupFormConfig,
  simpleLookupFields,
  simpleLookupInitial,
  SimpleLookupForm,
  statusField,
} from '@/shared/components/catalog/FabricLookupFormPage';

const parseStatus = (value: unknown) =>
  String(value || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active';

const safeTrim = (value: unknown) => String(value ?? '').trim();

const fiberOptions = ['Cotton', 'Polyester', 'Linen', 'Viscose', 'Silk', 'Wool', 'Jute', 'Nylon', 'Acrylic', 'Blend', 'Other'].map(
  (value) => ({ value, label: value })
);

const gradeOptions = ['Premium', 'Standard', 'Export', 'Commercial'].map((value) => ({ value, label: value }));

const parseOptionalPercent = (value: unknown) => {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export type FabricQualityForm = {
  name: string;
  composition: string;
  primaryFiber: string;
  primaryFiberPercent: string;
  secondaryFiber: string;
  secondaryFiberPercent: string;
  grade: string;
  remarks: string;
  status: 'active' | 'inactive';
};

export const fabricTypeListConfig: FabricLookupListConfig<{ id: string; name: string; status: 'active' | 'inactive' }> = {
  segment: 'fabric-type',
  title: 'Fabric Type',
  description: 'Manage fabric types used in fabric master dropdowns.',
  basePath: '/catalog/fabric-type',
  api: fabricTypeApi,
  columns: [],
  importTemplateRow: { Name: 'Voile', Status: 'active' },
  mapImportRow: (row) => ({
    name: String(row.Name || row.name || '').trim(),
    status: parseStatus(row.Status || row.status),
  }),
};

export const fabricTypeFormConfig: FabricLookupFormConfig<SimpleLookupForm> = {
  segment: 'fabric-type',
  permissionPath: 'Catalog.Fabric Type',
  title: 'Fabric Type',
  listPath: '/catalog/fabric-type',
  api: fabricTypeApi,
  fields: simpleLookupFields,
  getInitialValues: simpleLookupInitial,
  mapFromEntity: (entity) => ({ name: entity.name || '', status: entity.status || 'active' }),
};

export const fabricColorListConfig: FabricLookupListConfig<FabricColorLookup> = {
  segment: 'fabric-color',
  title: 'Fabric Color',
  description: 'Manage fabric colors for fabric master. Color code can be a hex value or Pantone reference.',
  basePath: '/catalog/fabric-color',
  api: fabricColorApi,
  columns: [
    { key: 'colorCode', label: 'Color Code', render: (row) => row.colorCode || '—', exportValue: (row) => row.colorCode || '' },
  ],
  importTemplateRow: { Name: 'White', 'Color Code': '#FFFFFF', Status: 'active' },
  importTemplateRows: [
    { Name: 'White', 'Color Code': '#FFFFFF', Status: 'active' },
    { Name: 'Ivory', 'Color Code': '11-0601', Status: 'active' },
  ],
  mapImportRow: (row) => {
    const colorCode = String(row['Color Code'] || row.colorCode || row.Pantone || row.pantone || '').trim();
    return {
      name: String(row.Name || row.name || '').trim(),
      colorCode,
      status: parseStatus(row.Status || row.status),
    };
  },
};

export const fabricColorFormConfig: FabricLookupFormConfig<{
  name: string;
  colorCode: string;
  status: 'active' | 'inactive';
}> = {
  segment: 'fabric-color',
  permissionPath: 'Catalog.Fabric Color',
  title: 'Fabric Color',
  listPath: '/catalog/fabric-color',
  api: fabricColorApi,
  fields: [
    { name: 'name', label: 'Name', required: true },
    {
      name: 'colorCode',
      label: 'Color Code',
      required: true,
      placeholder: 'Hex (#FFFFFF) or Pantone (11-0601)',
    },
    statusField,
  ],
  getInitialValues: () => ({ name: '', colorCode: '', status: 'active' }),
  mapFromEntity: (entity) => ({
    name: entity.name || '',
    colorCode: entity.colorCode || entity.pantone || '',
    status: entity.status || 'active',
  }),
};

export const fabricQualityListConfig: FabricLookupListConfig<FabricQualityLookup> = {
  segment: 'fabric-quality',
  title: 'Fabric Quality',
  description: 'Manage fabric quality and fiber composition (e.g. 100% Cotton, poly-cotton blends).',
  basePath: '/catalog/fabric-quality',
  api: fabricQualityApi,
  columns: [
    {
      key: 'composition',
      label: 'Composition',
      render: (row) => row.composition || '—',
      exportValue: (row) => row.composition || '',
    },
    {
      key: 'primaryFiber',
      label: 'Primary Fiber',
      render: (row) => row.primaryFiber || '—',
      exportValue: (row) => row.primaryFiber || '',
    },
    {
      key: 'primaryFiberPercent',
      label: 'Primary %',
      render: (row) => (row.primaryFiberPercent != null ? `${row.primaryFiberPercent}%` : '—'),
      exportValue: (row) => row.primaryFiberPercent ?? '',
    },
    {
      key: 'grade',
      label: 'Grade',
      render: (row) => row.grade || '—',
      exportValue: (row) => row.grade || '',
    },
  ],
  importTemplateRow: {
    Name: '100% Cotton',
    Composition: '100% Cotton',
    'Primary Fiber': 'Cotton',
    'Primary Fiber %': 100,
    Grade: 'Premium',
    Status: 'active',
  },
  importTemplateRows: [
    {
      Name: '100% Cotton',
      Composition: '100% Cotton',
      'Primary Fiber': 'Cotton',
      'Primary Fiber %': 100,
      Grade: 'Premium',
      Status: 'active',
    },
    {
      Name: 'Poly Cotton Blend',
      Composition: '65% Polyester 35% Cotton',
      'Primary Fiber': 'Polyester',
      'Primary Fiber %': 65,
      'Secondary Fiber': 'Cotton',
      'Secondary Fiber %': 35,
      Grade: 'Standard',
      Status: 'active',
    },
  ],
  mapImportRow: (row) => ({
    name: String(row.Name || row.name || '').trim(),
    composition: String(row.Composition || row.composition || '').trim(),
    primaryFiber: String(row['Primary Fiber'] || row.primaryFiber || '').trim(),
    primaryFiberPercent: parseOptionalPercent(row['Primary Fiber %'] ?? row.primaryFiberPercent),
    secondaryFiber: String(row['Secondary Fiber'] || row.secondaryFiber || '').trim(),
    secondaryFiberPercent: parseOptionalPercent(row['Secondary Fiber %'] ?? row.secondaryFiberPercent),
    grade: String(row.Grade || row.grade || '').trim(),
    remarks: String(row.Remarks || row.remarks || '').trim(),
    status: parseStatus(row.Status || row.status),
  }),
};

export const fabricQualityFormConfig: FabricLookupFormConfig<FabricQualityForm> = {
  segment: 'fabric-quality',
  permissionPath: 'Catalog.Fabric Quality',
  title: 'Fabric Quality',
  listPath: '/catalog/fabric-quality',
  api: fabricQualityApi,
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'e.g. 100% Cotton' },
    { name: 'composition', label: 'Composition', placeholder: 'e.g. 100% Cotton or 65% Polyester 35% Cotton' },
    { name: 'primaryFiber', label: 'Primary Fiber', type: 'select', options: fiberOptions },
    { name: 'primaryFiberPercent', label: 'Primary Fiber %', type: 'number', placeholder: '0–100' },
    { name: 'secondaryFiber', label: 'Secondary Fiber', type: 'select', options: fiberOptions },
    { name: 'secondaryFiberPercent', label: 'Secondary Fiber %', type: 'number', placeholder: '0–100' },
    { name: 'grade', label: 'Grade', type: 'select', options: gradeOptions },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
    statusField,
  ],
  getInitialValues: () => ({
    name: '',
    composition: '',
    primaryFiber: '',
    primaryFiberPercent: '',
    secondaryFiber: '',
    secondaryFiberPercent: '',
    grade: '',
    remarks: '',
    status: 'active',
  }),
  mapFromEntity: (entity) => ({
    name: entity.name || '',
    composition: entity.composition || '',
    primaryFiber: entity.primaryFiber || '',
    primaryFiberPercent: entity.primaryFiberPercent != null ? String(entity.primaryFiberPercent) : '',
    secondaryFiber: entity.secondaryFiber || '',
    secondaryFiberPercent: entity.secondaryFiberPercent != null ? String(entity.secondaryFiberPercent) : '',
    grade: entity.grade || '',
    remarks: entity.remarks || '',
    status: entity.status || 'active',
  }),
  mapToPayload: (values) => ({
    name: safeTrim(values.name),
    composition: safeTrim(values.composition),
    primaryFiber: safeTrim(values.primaryFiber),
    primaryFiberPercent: parseOptionalPercent(values.primaryFiberPercent),
    secondaryFiber: safeTrim(values.secondaryFiber),
    secondaryFiberPercent: parseOptionalPercent(values.secondaryFiberPercent),
    grade: safeTrim(values.grade),
    remarks: safeTrim(values.remarks),
    status: values.status || 'active',
  }),
};

export const fabricYarnCountListConfig = {
  ...fabricTypeListConfig,
  segment: 'fabric-yarn-count' as const,
  title: 'Fabric Yarn/Count',
  description: 'Manage yarn/count options for fabric master (e.g. 60\'s Compact+2/100 Cotton).',
  basePath: '/catalog/fabric-yarn-count',
  api: fabricYarnCountApi,
  importTemplateRow: { Name: "60's Compact+2/100 Cotton", Status: 'active' },
  importTemplateRows: [
    { Name: "60's Compact+2/100 Cotton", Status: 'active' },
    { Name: '40s Ring Cotton', Status: 'active' },
  ],
};

export const fabricYarnCountFormConfig: FabricLookupFormConfig<SimpleLookupForm> = {
  ...fabricTypeFormConfig,
  segment: 'fabric-yarn-count',
  permissionPath: 'Catalog.Fabric Yarn/Count',
  title: 'Fabric Yarn/Count',
  listPath: '/catalog/fabric-yarn-count',
  api: fabricYarnCountApi,
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: "e.g. 60's Compact+2/100 Cotton" },
    statusField,
  ],
};

const measurementCategories: FabricMeasurementCategory[] = ['length', 'weight', 'quantity', 'area'];

export const fabricMeasurementListConfig: FabricLookupListConfig<FabricMeasurementLookup> = {
  segment: 'fabric-measurement',
  title: 'Fabric Measurement',
  description: 'Manage measurement units for GLM, finished width, and other fabric fields.',
  basePath: '/catalog/fabric-measurement',
  api: fabricMeasurementApi,
  columns: [
    { key: 'symbol', label: 'Symbol', render: (row) => row.symbol || '—', exportValue: (row) => row.symbol || '' },
    {
      key: 'category',
      label: 'Category',
      render: (row) => row.category,
      exportValue: (row) => row.category,
    },
  ],
  importTemplateRow: { Name: 'Inch', Symbol: 'in', Category: 'length', Status: 'active' },
  importTemplateRows: [
    { Name: 'Inch', Symbol: 'in', Category: 'length', Status: 'active' },
    { Name: 'GSM', Symbol: 'gsm', Category: 'weight', Status: 'active' },
    { Name: 'Kg', Symbol: 'kg', Category: 'weight', Status: 'active' },
  ],
  mapImportRow: (row) => ({
    name: String(row.Name || row.name || '').trim(),
    symbol: String(row.Symbol || row.symbol || '').trim(),
    category: String(row.Category || row.category || 'length').toLowerCase() as FabricMeasurementCategory,
    status: parseStatus(row.Status || row.status),
  }),
};

export const fabricMeasurementFormConfig: FabricLookupFormConfig<{
  name: string;
  symbol: string;
  category: FabricMeasurementCategory;
  status: 'active' | 'inactive';
}> = {
  segment: 'fabric-measurement',
  permissionPath: 'Catalog.Fabric Measurement',
  title: 'Fabric Measurement',
  listPath: '/catalog/fabric-measurement',
  api: fabricMeasurementApi,
  fields: [
    { name: 'name', label: 'Name', required: true },
    { name: 'symbol', label: 'Symbol' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: measurementCategories.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
    },
    statusField,
  ],
  getInitialValues: () => ({ name: '', symbol: '', category: 'length', status: 'active' }),
  mapFromEntity: (entity) => ({
    name: entity.name || '',
    symbol: entity.symbol || '',
    category: entity.category || 'length',
    status: entity.status || 'active',
  }),
};
