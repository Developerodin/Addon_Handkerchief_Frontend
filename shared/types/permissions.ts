export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export interface CrudPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export const EMPTY_CRUD: CrudPermissions = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

export const FULL_CRUD: CrudPermissions = {
  create: true,
  read: true,
  update: true,
  delete: true,
};

/** Catalog permission keys (must match backend navigationHelper CATALOG_MODULES). */
export const CATALOG_MODULES = [
  'Items',
  'Category',
  'Style codes',
  'Fabric master',
  'Fabric Type',
  'Fabric Color',
  'Fabric Quality',
  'Fabric Yarn',
  'Fabric Count',
  'Fabric Measurement',
  'Fabric Suppliers',
  'Thread Catalog',
  'Thread Suppliers',
  'Packaging materials',
  'Process Master',
  'Attributes Master',
  'Machines & Configuration',
  'Workers / Operators',
  'Storage Racks',
  'Containers Master',
  'Label Templates & Device Registry',
] as const;

export type CatalogModule = (typeof CATALOG_MODULES)[number];

/** Fabric lookup sub-masters inherit Catalog.Fabric master when their own CRUD is unset. */
export const FABRIC_LOOKUP_MODULES: CatalogModule[] = [
  'Fabric Type',
  'Fabric Color',
  'Fabric Quality',
  'Fabric Yarn',
  'Fabric Count',
  'Fabric Measurement',
];

/** Map legacy Catalog keys from older user navigation documents. */
export const CATALOG_KEY_ALIASES: Record<string, CatalogModule> = {
  Categories: 'Category',
  'Style Codes': 'Style codes',
  'Raw Material': 'Packaging materials',
  Processes: 'Process Master',
  Attributes: 'Attributes Master',
};

export type HelpSupportTabKey = 'Files' | 'Tasks' | 'Tickets';

export const HELP_SUPPORT_TABS: HelpSupportTabKey[] = ['Files', 'Tasks', 'Tickets'];

export interface HelpSupportPermissions {
  enabled: boolean;
  Files: CrudPermissions;
  Tasks: CrudPermissions;
  Tickets: CrudPermissions;
}

export const FULL_HELP_SUPPORT: HelpSupportPermissions = {
  enabled: true,
  Files: { ...FULL_CRUD },
  Tasks: { ...FULL_CRUD },
  Tickets: { ...FULL_CRUD },
};

export const EMPTY_HELP_SUPPORT: HelpSupportPermissions = {
  enabled: false,
  Files: { ...EMPTY_CRUD },
  Tasks: { ...EMPTY_CRUD },
  Tickets: { ...EMPTY_CRUD },
};

const normalizeCrud = (value: unknown): CrudPermissions => {
  if (value === true) return { ...FULL_CRUD };
  if (value === false || value == null) return { ...EMPTY_CRUD };
  if (typeof value === 'object') {
    const v = value as Partial<CrudPermissions>;
    return {
      create: Boolean(v.create),
      read: Boolean(v.read),
      update: Boolean(v.update),
      delete: Boolean(v.delete),
    };
  }
  return { ...EMPTY_CRUD };
};

/** Create, update, and delete all require read access. */
const applyCrudDependencies = (crud: CrudPermissions): CrudPermissions => {
  const next = { ...crud };
  if (next.create || next.update || next.delete) {
    next.read = true;
  }
  if (!next.read) {
    return { ...EMPTY_CRUD };
  }
  return next;
};

const normalizeHelpSupportTab = (value: unknown): CrudPermissions => {
  if (value === true) return { ...FULL_CRUD };
  if (value === false) return { ...EMPTY_CRUD };
  return applyCrudDependencies(normalizeCrud(value));
};

export const FABRIC_SCREEN_KEYS = [
  'Fabric / Purchase orders',
  'Fabric / Drafts',
  'Fabric / Receipts',
  'Fabric / GRN history',
  'Fabric / Vendor return',
  'Fabric / Return challan',
  'Fabric / Issue',
  'Fabric / Return',
  'Fabric / Storage',
  'Fabric / Live inventory',
  'Fabric / Stock report',
  'Fabric / PO analytics',
  'Fabric / Fabric analytics',
] as const;

export const FACTORY_SCREEN_KEYS = [
  'Sync',
  'Store / Purchase orders',
  'Store / Receipt',
  'Store / Racks and issue',
  'Production / Orders',
  'Production / Floor',
  'Production / Cut',
  'Production / Selvage',
  'Production / Half moon',
  'Production / Vertical hem',
  'Production / Bundle',
  'Production / Horizontal hem',
  'Production / Thread cut',
  'Production / Iron',
  'Production / Route split',
  'Production / Embroidery',
  'Production / Sticker',
  'Quality / Fabric QC',
  'Quality / Floor checks',
  'Quality / Grades',
  'Warehouse / Packing',
  'Warehouse / Boxes',
  'Warehouse / Orders',
  'Warehouse / Dispatch',
  'Accounts / Invoices',
  'Reports',
  ...FABRIC_SCREEN_KEYS,
] as const;

export type FactoryScreenKey = (typeof FACTORY_SCREEN_KEYS)[number];

/** Older Store grants fill a Fabric screen the first time that screen has no saved flags. */
export const FABRIC_FROM_LEGACY: Partial<Record<FactoryScreenKey, FactoryScreenKey>> = {
  'Fabric / Purchase orders': 'Store / Purchase orders',
  'Fabric / Drafts': 'Store / Purchase orders',
  'Fabric / Receipts': 'Store / Receipt',
  'Fabric / GRN history': 'Store / Receipt',
  'Fabric / Vendor return': 'Store / Receipt',
  'Fabric / Return challan': 'Store / Receipt',
  'Fabric / Issue': 'Store / Racks and issue',
  'Fabric / Return': 'Store / Racks and issue',
  'Fabric / Storage': 'Store / Racks and issue',
  'Production / Cut': 'Production / Floor',
  'Production / Selvage': 'Production / Floor',
  'Production / Half moon': 'Production / Floor',
  'Production / Vertical hem': 'Production / Floor',
  'Production / Bundle': 'Production / Floor',
  'Production / Horizontal hem': 'Production / Floor',
  'Production / Thread cut': 'Production / Floor',
  'Production / Iron': 'Production / Floor',
  'Production / Route split': 'Production / Floor',
  'Production / Embroidery': 'Production / Floor',
  'Production / Sticker': 'Production / Floor',
  'Fabric / Live inventory': 'Reports',
  'Fabric / Stock report': 'Reports',
  'Fabric / PO analytics': 'Reports',
  'Fabric / Fabric analytics': 'Reports',
};

export const FACTORY_ROUTES: Record<string, FactoryScreenKey> = {
  '/sync': 'Sync',
  '/store/purchase-orders/drafts': 'Fabric / Drafts',
  '/store/purchase-orders': 'Fabric / Purchase orders',
  '/store/po-received': 'Fabric / Receipts',
  '/store/receipt': 'Fabric / Receipts',
  '/store/grn': 'Fabric / GRN history',
  '/store/vendor-returns': 'Fabric / Vendor return',
  '/store/return-challans': 'Fabric / Return challan',
  '/store/issue': 'Fabric / Issue',
  '/store/fabric-return': 'Fabric / Return',
  '/store/racks': 'Fabric / Storage',
  '/store/reports/live-inventory': 'Fabric / Live inventory',
  '/store/reports/stock': 'Fabric / Stock report',
  '/store/reports/po': 'Fabric / PO analytics',
  '/store/reports/fabric': 'Fabric / Fabric analytics',
  '/production/orders': 'Production / Orders',
  '/production/floor/cut': 'Production / Cut',
  '/production/floor/selvage': 'Production / Selvage',
  '/production/floor/half-moon': 'Production / Half moon',
  '/production/floor/vertical-hem': 'Production / Vertical hem',
  '/production/floor/bundle': 'Production / Bundle',
  '/production/floor/horizontal-hem': 'Production / Horizontal hem',
  '/production/floor/thread-cut': 'Production / Thread cut',
  '/production/floor/iron': 'Production / Iron',
  '/production/floor/route-split': 'Production / Route split',
  '/production/floor/embroidery': 'Production / Embroidery',
  '/production/floor/sticker': 'Production / Sticker',
  '/production/floor': 'Production / Floor',
  '/quality/fabric': 'Quality / Fabric QC',
  '/quality/floor': 'Quality / Floor checks',
  '/quality/grades': 'Quality / Grades',
  '/warehouse/packing': 'Warehouse / Packing',
  '/warehouse/boxes': 'Warehouse / Boxes',
  '/warehouse/orders': 'Warehouse / Orders',
  '/warehouse/dispatch': 'Warehouse / Dispatch',
  '/accounts/invoices': 'Accounts / Invoices',
  '/reports': 'Reports',
};

export interface NavigationPermissions extends Record<FactoryScreenKey, CrudPermissions> {
  Dashboard: CrudPermissions;
  Catalog: Record<CatalogModule, CrudPermissions>;
  Users: CrudPermissions;
  'Revision review': CrudPermissions;
  'Help & Support': HelpSupportPermissions;
}

export type UserRole = 'user' | 'accounts' | 'admin' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  profilePicture?: string;
  navigation: NavigationPermissions;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const buildCatalogDefaults = (): Record<CatalogModule, CrudPermissions> =>
  Object.fromEntries(CATALOG_MODULES.map((key) => [key, { ...EMPTY_CRUD }])) as Record<
    CatalogModule,
    CrudPermissions
  >;

const factoryDefaults = (): Pick<NavigationPermissions, FactoryScreenKey> =>
  Object.fromEntries(FACTORY_SCREEN_KEYS.map((key) => [key, { ...EMPTY_CRUD }])) as Pick<
    NavigationPermissions,
    FactoryScreenKey
  >;

export const DEFAULT_NAVIGATION: NavigationPermissions = {
  Dashboard: { ...EMPTY_CRUD },
  Catalog: buildCatalogDefaults(),
  Users: { ...EMPTY_CRUD },
  'Revision review': { ...EMPTY_CRUD },
  'Help & Support': { ...FULL_HELP_SUPPORT },
  ...factoryDefaults(),
};

/** Normalize legacy boolean or partial object Help & Support permissions. */
export const normalizeHelpSupport = (value: unknown): HelpSupportPermissions => {
  if (value === true) return { ...FULL_HELP_SUPPORT };
  if (value === false || value == null) return { ...EMPTY_HELP_SUPPORT };
  if (typeof value === 'object') {
    const v = value as Partial<HelpSupportPermissions> & Record<string, unknown>;
    const enabled = Boolean(v.enabled);
    if (!enabled) return { ...EMPTY_HELP_SUPPORT };
    return {
      enabled: true,
      Files: normalizeHelpSupportTab(v.Files),
      Tasks: normalizeHelpSupportTab(v.Tasks),
      Tickets: normalizeHelpSupportTab(v.Tickets),
    };
  }
  return { ...EMPTY_HELP_SUPPORT };
};

export const isFullHelpSupportCrud = (value: HelpSupportPermissions): boolean =>
  value.enabled && HELP_SUPPORT_TABS.every((tab) => {
    const crud = value[tab];
    return crud.create && crud.read && crud.update && crud.delete;
  });

export type HubTabSlug = 'files' | 'tasks' | 'tickets';

const HUB_TAB_TO_KEY: Record<HubTabSlug, HelpSupportTabKey> = {
  files: 'Files',
  tasks: 'Tasks',
  tickets: 'Tickets',
};

export const hasHelpSupportHubAccess = (value: unknown): boolean => {
  const hs = normalizeHelpSupport(value);
  return hs.enabled && HELP_SUPPORT_TABS.some((tab) => hs[tab].read);
};

export const hasHelpSupportTabAccess = (value: unknown, tab: HubTabSlug): boolean => {
  const hs = normalizeHelpSupport(value);
  if (!hs.enabled) return false;
  return Boolean(hs[HUB_TAB_TO_KEY[tab]].read);
};

export const firstAllowedHelpSupportTab = (value: unknown): HubTabSlug | null => {
  const hs = normalizeHelpSupport(value);
  if (!hs.enabled) return null;
  if (hs.Files.read) return 'files';
  if (hs.Tasks.read) return 'tasks';
  if (hs.Tickets.read) return 'tickets';
  return null;
};

export { normalizeCrud, applyCrudDependencies };

export const applyCrudChange = (
  current: CrudPermissions,
  key: CrudAction,
  checked: boolean
): CrudPermissions => {
  if (key === 'read' && !checked) {
    return { ...EMPTY_CRUD };
  }
  return applyCrudDependencies({ ...current, [key]: checked });
};

/**
 * Super admin treats a missing factory screen as full access, same as the live menu.
 * An explicit saved deny stays denied.
 */
export const fillUnsetSuperAdminScreens = (
  navigation: NavigationPermissions,
  role: UserRole | undefined,
  raw: Partial<NavigationPermissions> | null | undefined
): NavigationPermissions => {
  if (role !== 'super_admin') return navigation;
  const next = { ...navigation };
  if (raw?.['Revision review'] == null) next['Revision review'] = { ...FULL_CRUD };
  for (const key of FACTORY_SCREEN_KEYS) {
    if (raw?.[key] == null) next[key] = { ...FULL_CRUD };
  }
  return next;
};

export const mergeNavigationWithDefaults = (
  partial?: Partial<NavigationPermissions> & { Catalog?: Record<string, unknown> }
): NavigationPermissions => {
  if (!partial) return JSON.parse(JSON.stringify(DEFAULT_NAVIGATION));

  const catalog = buildCatalogDefaults();
  const incomingCatalog = (partial.Catalog || {}) as Record<string, unknown>;

  for (const key of CATALOG_MODULES) {
    catalog[key] = applyCrudDependencies(normalizeCrud(incomingCatalog[key]));
  }

  // Migrate legacy keys if the new key was empty
  for (const [legacy, next] of Object.entries(CATALOG_KEY_ALIASES)) {
    const hasNew =
      catalog[next].create || catalog[next].read || catalog[next].update || catalog[next].delete;
    if (!hasNew && incomingCatalog[legacy] != null) {
      catalog[next] = applyCrudDependencies(normalizeCrud(incomingCatalog[legacy]));
    }
  }

  const fabricMaster = catalog['Fabric master'];
  for (const key of FABRIC_LOOKUP_MODULES) {
    const hasOwn =
      catalog[key].create || catalog[key].read || catalog[key].update || catalog[key].delete;
    if (!hasOwn && (fabricMaster.read || fabricMaster.create || fabricMaster.update || fabricMaster.delete)) {
      catalog[key] = { ...fabricMaster };
    }
  }

  const factory = factoryDefaults();
  for (const key of FACTORY_SCREEN_KEYS) {
    const legacy = FABRIC_FROM_LEGACY[key];
    const raw = partial?.[key] != null ? partial[key] : legacy ? partial?.[legacy] : undefined;
    factory[key] = applyCrudDependencies(normalizeCrud(raw));
  }

  return {
    Dashboard: applyCrudDependencies(normalizeCrud(partial.Dashboard)),
    Catalog: catalog,
    Users: applyCrudDependencies(normalizeCrud(partial.Users)),
    'Revision review': applyCrudDependencies(normalizeCrud(partial['Revision review'])),
    'Help & Support': normalizeHelpSupport(partial['Help & Support']),
    ...factory,
  };
};

const getCrudAtPathDirect = (
  permissions: NavigationPermissions | null,
  path: string
): CrudPermissions => {
  if (!permissions) return { ...EMPTY_CRUD };

  if (path.startsWith('Help & Support.')) {
    const hs = normalizeHelpSupport(permissions['Help & Support']);
    if (!hs.enabled) return { ...EMPTY_CRUD };
    const tabKey = path.slice('Help & Support.'.length) as HelpSupportTabKey;
    if (!HELP_SUPPORT_TABS.includes(tabKey)) return { ...EMPTY_CRUD };
    return applyCrudDependencies(normalizeCrud(hs[tabKey]));
  }

  const keys = path.split('.');
  let current: unknown = permissions;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return { ...EMPTY_CRUD };
    current = (current as Record<string, unknown>)[key];
  }
  return applyCrudDependencies(normalizeCrud(current));
};

const mergeCrudOr = (primary: CrudPermissions, fallback: CrudPermissions): CrudPermissions =>
  applyCrudDependencies({
    create: primary.create || fallback.create,
    read: primary.read || fallback.read,
    update: primary.update || fallback.update,
    delete: primary.delete || fallback.delete,
  });

export const getCrudAtPath = (
  permissions: NavigationPermissions | null,
  path: string
): CrudPermissions => {
  const direct = getCrudAtPathDirect(permissions, path);
  if (path.startsWith('Catalog.') && FABRIC_LOOKUP_MODULES.some((module) => path === `Catalog.${module}`)) {
    const fabricMaster = getCrudAtPathDirect(permissions, 'Catalog.Fabric master');
    return mergeCrudOr(direct, fabricMaster);
  }
  return direct;
};

/** Map catalog route segment to permission key */
export const CATALOG_PATH_TO_MODULE: Record<string, CatalogModule> = {
  items: 'Items',
  categories: 'Category',
  'style-codes': 'Style codes',
  'style-code-combos': 'Style codes',
  fabric: 'Fabric master',
  'fabric-master': 'Fabric master',
  'fabric-lookups': 'Fabric master',
  'fabric-type': 'Fabric Type',
  'fabric-color': 'Fabric Color',
  'fabric-quality': 'Fabric Quality',
  'fabric-yarn': 'Fabric Yarn',
  'fabric-count': 'Fabric Count',
  'fabric-measurement': 'Fabric Measurement',
  'fabric-suppliers': 'Fabric Suppliers',
  thread: 'Thread Catalog',
  'thread-suppliers': 'Thread Suppliers',
  'packaging-materials': 'Packaging materials',
  'raw-material': 'Packaging materials',
  processes: 'Process Master',
  attributes: 'Attributes Master',
  machines: 'Machines & Configuration',
  workers: 'Workers / Operators',
  'storage-racks': 'Storage Racks',
  containers: 'Containers Master',
  'label-templates': 'Label Templates & Device Registry',
  'device-registry': 'Label Templates & Device Registry',
};
