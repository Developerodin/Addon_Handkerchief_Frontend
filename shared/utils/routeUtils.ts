import type { NavigationPermissions } from '@/shared/types/permissions';
import { hasHelpSupportHubAccess } from '@/shared/types/permissions';

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

  const catalogRoutes: { path: string; key: keyof NavigationPermissions['Catalog'] }[] = [
    { path: '/catalog/items', key: 'Items' },
    { path: '/catalog/categories', key: 'Categories' },
    { path: '/catalog/raw-material', key: 'Raw Material' },
    { path: '/catalog/processes', key: 'Processes' },
    { path: '/catalog/attributes', key: 'Attributes' },
    { path: '/catalog/style-codes', key: 'Style Codes' },
  ];

  for (const { path, key } of catalogRoutes) {
    if (hasRead(permissions.Catalog?.[key])) return path;
  }

  if (hasRead(permissions.Users)) return '/users';
  if (hasHelpSupportHubAccess(permissions['Help & Support'])) return '/help-and-support';

  return '/dashboards/main';
};
