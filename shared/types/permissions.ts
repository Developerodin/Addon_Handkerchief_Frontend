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

/** Map legacy Catalog keys from older user navigation documents. */
export const CATALOG_KEY_ALIASES: Record<string, CatalogModule> = {
  Categories: 'Category',
  'Style Codes': 'Style codes',
  'Raw Material': 'Packaging materials',
  Processes: 'Process Master',
  Attributes: 'Attributes Master',
};

export interface NavigationPermissions {
  Dashboard: CrudPermissions;
  Catalog: Record<CatalogModule, CrudPermissions>;
  Users: CrudPermissions;
  'Help & Support': boolean;
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
  'Help & Support': true,
};

export const normalizeCrud = (value: unknown): CrudPermissions => {
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
export const applyCrudDependencies = (crud: CrudPermissions): CrudPermissions => {
  const next = { ...crud };
  if (next.create || next.update || next.delete) {
    next.read = true;
  }
  if (!next.read) {
    return { ...EMPTY_CRUD };
  }
  return next;
};

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

  return {
    Dashboard: applyCrudDependencies(normalizeCrud(partial.Dashboard)),
    Catalog: catalog,
    Users: applyCrudDependencies(normalizeCrud(partial.Users)),
    'Help & Support':
      typeof partial['Help & Support'] === 'boolean'
        ? partial['Help & Support']
        : true,
  };
};

export const getCrudAtPath = (
  permissions: NavigationPermissions | null,
  path: string
): CrudPermissions => {
  if (!permissions) return { ...EMPTY_CRUD };
  const keys = path.split('.');
  let current: unknown = permissions;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return { ...EMPTY_CRUD };
    current = (current as Record<string, unknown>)[key];
  }
  return applyCrudDependencies(normalizeCrud(current));
};

/** Map catalog route segment to permission key */
export const CATALOG_PATH_TO_MODULE: Record<string, CatalogModule> = {
  items: 'Items',
  categories: 'Category',
  'style-codes': 'Style codes',
  'style-code-combos': 'Style codes',
  fabric: 'Fabric master',
  'fabric-master': 'Fabric master',
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
