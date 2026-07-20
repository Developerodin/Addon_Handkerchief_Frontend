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

export const CATALOG_MODULES = [
  'Items',
  'Categories',
  'Raw Material',
  'Processes',
  'Attributes',
  'Style Codes',
] as const;

export type CatalogModule = (typeof CATALOG_MODULES)[number];

export interface NavigationPermissions {
  Dashboard: CrudPermissions;
  Catalog: Record<CatalogModule, CrudPermissions>;
  Users: CrudPermissions;
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

export const mergeNavigationWithDefaults = (
  partial?: Partial<NavigationPermissions>
): NavigationPermissions => {
  if (!partial) return JSON.parse(JSON.stringify(DEFAULT_NAVIGATION));

  const catalog = buildCatalogDefaults();
  if (partial.Catalog) {
    for (const key of CATALOG_MODULES) {
      catalog[key] = normalizeCrud(partial.Catalog[key]);
    }
  }

  return {
    Dashboard: normalizeCrud(partial.Dashboard),
    Catalog: catalog,
    Users: normalizeCrud(partial.Users),
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
  return normalizeCrud(current);
};

/** Map catalog route segment to permission key */
export const CATALOG_PATH_TO_MODULE: Record<string, CatalogModule> = {
  items: 'Items',
  categories: 'Categories',
  'raw-material': 'Raw Material',
  processes: 'Processes',
  attributes: 'Attributes',
  'style-codes': 'Style Codes',
};
