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
  'Fabric Yarn/Count',
  'Fabric Measurement',
  'Fabric Suppliers',
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
  'Fabric Yarn/Count',
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

export interface NavigationPermissions {
  Dashboard: CrudPermissions;
  Catalog: Record<CatalogModule, CrudPermissions>;
  Users: CrudPermissions;
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

export const DEFAULT_NAVIGATION: NavigationPermissions = {
  Dashboard: { ...EMPTY_CRUD },
  Catalog: buildCatalogDefaults(),
  Users: { ...EMPTY_CRUD },
  'Help & Support': { ...FULL_HELP_SUPPORT },
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

  return {
    Dashboard: applyCrudDependencies(normalizeCrud(partial.Dashboard)),
    Catalog: catalog,
    Users: applyCrudDependencies(normalizeCrud(partial.Users)),
    'Help & Support': normalizeHelpSupport(partial['Help & Support']),
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
  'fabric-yarn-count': 'Fabric Yarn/Count',
  'fabric-measurement': 'Fabric Measurement',
  'fabric-suppliers': 'Fabric Suppliers',
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
