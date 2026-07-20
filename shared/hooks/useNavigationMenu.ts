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

export const useNavigationMenu = (menuItems: MenuItem[]): MenuItem[] => {
  const { hasPermission, hasSubPermission, isLoading } = useNavigation();

  return useMemo(() => {
    if (isLoading) return [];

    return menuItems
      .filter((item) => {
        if (item.menutitle) return true;
        if (item.type === 'link' && item.path) return hasPermission(item.path);
        if (item.type === 'sub' && item.children) {
          const visibleChildren = item.children.filter(
            (child) => child.path && hasSubPermission(item.path || '/catalog', child.title)
          );
          return visibleChildren.length > 0;
        }
        return false;
      })
      .map((item) => {
        if (item.menutitle) return { ...item };
        if (item.type === 'sub' && item.children) {
          return cloneMenuItem({
            ...item,
            children: item.children.filter(
              (child) => child.path && hasSubPermission(item.path || '/catalog', child.title)
            ),
          });
        }
        return cloneMenuItem(item);
      });
  }, [menuItems, hasPermission, hasSubPermission, isLoading]);
};
