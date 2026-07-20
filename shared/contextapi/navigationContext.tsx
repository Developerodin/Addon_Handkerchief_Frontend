"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/shared/redux/store';
import {
  NavigationPermissions,
  CrudAction,
  mergeNavigationWithDefaults,
  getCrudAtPath,
  CATALOG_PATH_TO_MODULE,
} from '@/shared/types/permissions';

interface NavigationContextType {
  permissions: NavigationPermissions | null;
  hasPermission: (path: string) => boolean;
  hasSubPermission: (parent: string, child: string) => boolean;
  hasCrudPermission: (path: string, action: CrudAction) => boolean;
  isLoading: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);
const CACHE_VERSION = '1';

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const authInitialized = useSelector((state: RootState) => state.auth.authInitialized);
  const [permissions, setPermissions] = useState<NavigationPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authInitialized) return;

    if (!user?.navigation) {
      setPermissions(mergeNavigationWithDefaults(undefined));
      setIsLoading(false);
      return;
    }

    const merged = mergeNavigationWithDefaults(user.navigation);
    setPermissions(merged);

    if (typeof window !== 'undefined') {
      localStorage.setItem('navigationPermissions', JSON.stringify(merged));
      localStorage.setItem('navigationPermissionsVersion', CACHE_VERSION);
      localStorage.setItem('cachedUserId', user.id || user._id || '');
    }

    setIsLoading(false);
  }, [user, authInitialized]);

  const hasCrudPermission = (path: string, action: CrudAction): boolean => {
    const crud = getCrudAtPath(permissions, path);
    return Boolean(crud[action]);
  };

  const hasPermission = (path: string): boolean => {
    if (!permissions) return false;

    if (path === '/dashboards/main' || path === '/dashboard') {
      return hasCrudPermission('Dashboard', 'read');
    }
    if (path === '/users') {
      return hasCrudPermission('Users', 'read');
    }
    if (path === '/catalog') {
      return Object.values(permissions.Catalog).some((crud) => crud.read);
    }

    if (path.startsWith('/catalog/')) {
      const segment = path.replace('/catalog/', '').split('/')[0];
      const moduleKey = CATALOG_PATH_TO_MODULE[segment];
      if (moduleKey) {
        return hasCrudPermission(`Catalog.${moduleKey}`, 'read');
      }
    }

    return false;
  };

  const hasSubPermission = (parent: string, child: string): boolean => {
    if (parent === '/catalog') {
      return hasCrudPermission(`Catalog.${child}`, 'read');
    }
    return false;
  };

  return (
    <NavigationContext.Provider
      value={{ permissions, hasPermission, hasSubPermission, hasCrudPermission, isLoading }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export { mergeNavigationWithDefaults };
