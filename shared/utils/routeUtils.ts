import type { NavigationPermissions, CatalogModule } from '@/shared/types/permissions';

const hasRead = (crud?: { read?: boolean } | boolean): boolean => {
  if (crud === true) return true;
  if (crud && typeof crud === 'object') return Boolean(crud.read);
  return false;
};

/**
 * First route the user can access (for redirects when a page is forbidden).
 */
export const getFirstAvailableRoute = (permissions: NavigationPermissions | null): string => {
  if (!permissions) return '/auth/login';

  if (hasRead(permissions.Dashboard)) return '/dashboards/main';

  const catalogRoutes: { path: string; key: CatalogModule }[] = [
    { path: '/catalog/items', key: 'Items' },
    { path: '/catalog/categories', key: 'Category' },
    { path: '/catalog/style-codes', key: 'Style codes' },
    { path: '/catalog/fabric', key: 'Fabric master' },
    { path: '/catalog/fabric-suppliers', key: 'Fabric Suppliers' },
    { path: '/catalog/raw-material', key: 'Packaging materials' },
    { path: '/catalog/processes', key: 'Process Master' },
    { path: '/catalog/attributes', key: 'Attributes Master' },
    { path: '/catalog/machines', key: 'Machines & Configuration' },
    { path: '/catalog/workers', key: 'Workers / Operators' },
    { path: '/catalog/storage-racks', key: 'Storage Racks' },
    { path: '/catalog/containers', key: 'Containers Master' },
    { path: '/catalog/label-templates', key: 'Label Templates & Device Registry' },
  ];

  for (const { path, key } of catalogRoutes) {
    if (hasRead(permissions.Catalog?.[key])) return path;
  }

  if (hasRead(permissions.Users)) return '/users';
  if (permissions['Help & Support'] === true) return '/help-and-support';

  return '/dashboards/main';
};
