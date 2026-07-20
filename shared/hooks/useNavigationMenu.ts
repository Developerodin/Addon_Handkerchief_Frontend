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
        if (item.type === 'sub' && item.children) {
          return {
            ...item,
            children: item.children.filter(
              (child) => child.path && hasSubPermission(item.path || '/catalog', child.title)
            ),
          };
        }
        return item;
      });
  }, [menuItems, hasPermission, hasSubPermission, isLoading]);
};
