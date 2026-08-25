import { useMemo } from 'react';
import { useNavigation } from '@/shared/contextapi/navigationContext';

interface MenuItem {
  menutitle?: string;
  icon?: React.ReactNode;
  title: string;
  type: 'link' | 'sub';
  active: boolean;
  selected: boolean;
  path?: string;
  children?: MenuItem[];
}

/** Fresh copies so sidebar mutations never stick on shared menu definitions. */
function cloneMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    active: false,
    selected: false,
    children: item.children?.map(cloneMenuItem),
  };
}

export function cloneMenuTree(items: MenuItem[]): MenuItem[] {
  return items.map((item) => (item.menutitle ? { ...item } : cloneMenuItem(item)));
}

const isCatalogPath = (path?: string) => Boolean(path && path.startsWith('/catalog/'));

const filterCatalogChildren = (children: MenuItem[], hasPermission: (path: string) => boolean): MenuItem[] =>
  children
    .map((child) => {
      if (child.type === 'sub' && child.children?.length) {
        const nested = filterCatalogChildren(child.children, hasPermission);
        if (nested.length === 0) return null;
        return cloneMenuItem({ ...child, children: nested });
      }
      if (child.type === 'link' && child.path && hasPermission(child.path)) {
        return cloneMenuItem(child);
      }
      return null;
    })
    .filter(Boolean) as MenuItem[];

export const useNavigationMenu = (menuItems: MenuItem[]): MenuItem[] => {
  const { hasPermission, hasSubPermission, isLoading } = useNavigation();

  return useMemo(() => {
    if (isLoading) return [];

    return menuItems
      .filter((item) => {
        if (item.menutitle) return true;
        if (item.type === 'link' && item.path) return hasPermission(item.path);
        if (item.type === 'sub' && item.children) {
          if (item.path === '/catalog') {
            return filterCatalogChildren(item.children, hasPermission).length > 0;
          }
          const visibleChildren = item.children.filter((child) => {
            if (!child.path) return false;
            if (isCatalogPath(child.path)) {
              return hasPermission(child.path);
            }
            return hasSubPermission(item.path || '', child.title);
          });
          return visibleChildren.length > 0;
        }
        return false;
      })
      .map((item) => {
        if (item.menutitle) return { ...item };
        if (item.type === 'sub' && item.children) {
          if (item.path === '/catalog') {
            return cloneMenuItem({
              ...item,
              children: filterCatalogChildren(item.children, hasPermission),
            });
          }
          return cloneMenuItem({
            ...item,
            children: item.children.filter((child) => {
              if (!child.path) return false;
              if (isCatalogPath(child.path)) {
                return hasPermission(child.path);
              }
              return hasSubPermission(item.path || '', child.title);
            }),
          });
        }
        return cloneMenuItem(item);
      });
  }, [menuItems, hasPermission, hasSubPermission, isLoading]);
};
