"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import { CrudAction } from '@/shared/types/permissions';

interface RequireCrudPermissionProps {
  path: string;
  action?: CrudAction;
  children: React.ReactNode;
}

/** Redirects when user lacks read (default) or specific CRUD on a navigation path. */
export default function RequireCrudPermission({
  path,
  action = 'read',
  children,
}: RequireCrudPermissionProps) {
  const router = useRouter();
  const { hasCrudPermission, isLoading } = useNavigation();

  const allowed = hasCrudPermission(path, action);

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace('/dashboards/main/');
    }
  }, [isLoading, allowed, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="text-muted">Loading...</span>
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}
