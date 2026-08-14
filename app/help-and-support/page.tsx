'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import { useNavigation, canAccessHelpSupportTab } from '@/shared/contextapi/navigationContext';
import { firstAllowedHelpSupportTab, type HubTabSlug } from '@/shared/types/permissions';
import { isManagementSide, isDevTeamSide, isHelpSupportSuperAdmin } from './helpSupportConstants';
import FilesTab from './components/FilesTab';
import TasksTab from './components/TasksTab';
import TicketsTab from './components/TicketsTab';

type HubTab = HubTabSlug;

const TAB_LABELS: Record<HubTab, string> = {
  files: 'Files',
  tasks: 'Tasks',
  tickets: 'Tickets',
};

const isHubTab = (value: string | null): value is HubTab =>
  value === 'files' || value === 'tasks' || value === 'tickets';

/**
 * Handkerchief Help & Support hub — Files, Tasks, Tickets.
 */
export default function HelpAndSupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions, isLoading } = useNavigation();
  const user = useSelector(
    (state: { auth?: { user?: { role?: string; email?: string } } }) => state.auth?.user
  );
  const isManagement = isManagementSide(user?.role, user?.email);
  const isDev = isDevTeamSide(user?.role);
  const isSuperAdmin = isHelpSupportSuperAdmin(user?.role, user?.email);

  const allowedTabs = useMemo(() => {
    return (['files', 'tasks', 'tickets'] as HubTab[]).filter((tab) =>
      canAccessHelpSupportTab(permissions, tab, user?.role)
    );
  }, [permissions, user?.role]);

  const defaultTab = useMemo(
    () => firstAllowedHelpSupportTab(permissions?.['Help & Support']) || allowedTabs[0] || 'files',
    [permissions, allowedTabs]
  );

  const tabParam = searchParams.get('tab');
  const activeTab = useMemo((): HubTab => {
    if (isHubTab(tabParam) && allowedTabs.includes(tabParam)) return tabParam;
    return allowedTabs.includes(defaultTab) ? defaultTab : allowedTabs[0] || 'files';
  }, [tabParam, allowedTabs, defaultTab]);

  const canAccessTasks = canAccessHelpSupportTab(permissions, 'tasks', user?.role);
  const deepLinkTaskId = canAccessTasks ? searchParams.get('taskId') || undefined : undefined;
  const redirectedRef = useRef<string | null>(null);

  const handleTabClick = (tab: HubTab) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (tab === 'tasks') {
      const taskId = searchParams.get('taskId');
      if (taskId) params.set('taskId', taskId);
    }
    router.replace(`/help-and-support/?${params.toString()}`);
  };

  useEffect(() => {
    if (isLoading) return;

    const taskIdParam = searchParams.get('tab') === 'tasks' ? searchParams.get('taskId') : null;
    const signature = `${tabParam || ''}|${taskIdParam || ''}|${allowedTabs.join(',')}`;

    const tabAllowed = isHubTab(tabParam) ? canAccessHelpSupportTab(permissions, tabParam, user?.role) : false;
    const taskDeepLinkBlocked =
      Boolean(taskIdParam) && !canAccessHelpSupportTab(permissions, 'tasks', user?.role);
    const tabDeepLinkBlocked = Boolean(tabParam) && !tabAllowed;

    if (taskDeepLinkBlocked || tabDeepLinkBlocked) {
      if (redirectedRef.current !== signature) {
        redirectedRef.current = signature;
        if (taskDeepLinkBlocked) {
          toast.error('You do not have access to Tasks.');
        } else if (tabParam === 'tasks') {
          toast.error('You do not have access to the Tasks tab.');
        } else if (tabParam === 'tickets') {
          toast.error('You do not have access to the Tickets tab.');
        } else if (tabParam === 'files') {
          toast.error('You do not have access to the Files tab.');
        }
      }
      const nextParams = new URLSearchParams();
      if (allowedTabs.includes(defaultTab)) {
        nextParams.set('tab', defaultTab);
      }
      router.replace(
        nextParams.toString() ? `/help-and-support/?${nextParams.toString()}` : '/help-and-support/'
      );
      return;
    }

    redirectedRef.current = null;

    if (!tabParam && allowedTabs.length) {
      const nextTab = allowedTabs.includes(defaultTab) ? defaultTab : allowedTabs[0];
      router.replace(`/help-and-support/?tab=${nextTab}`);
    }
  }, [isLoading, searchParams, tabParam, permissions, user?.role, allowedTabs, defaultTab, router]);

  useEffect(() => {
    if (!isLoading && !allowedTabs.length) {
      router.replace('/dashboards/main');
    }
  }, [allowedTabs.length, isLoading, router]);

  const sideLabel = isManagement ? 'Management' : isDev ? 'Dev team' : 'Collaboration';

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!allowedTabs.length) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-gray-600">You do not have access to Help &amp; Support.</p>
        <p className="text-xs text-gray-500">Redirecting…</p>
      </div>
    );
  }

  return (
    <>
      <Seo title="Help & Support" />
      <div className="main-content !p-[10px]">
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <i className="ri-customer-service-2-line text-xl" aria-hidden />
              </span>
              <div>
                <h1 className="text-base font-bold text-gray-800">Help &amp; Support Hub</h1>
                <p className="text-xs text-gray-500">
                  {sideLabel} · Share files, assign tasks, and raise tickets
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex gap-1 border-b" role="tablist" aria-label="Hub sections">
            {allowedTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => handleTabClick(tab)}
                className={`-mb-px border-b-2 px-4 py-2 text-xs font-bold ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {activeTab === 'files' && allowedTabs.includes('files') && <FilesTab />}
          {activeTab === 'tasks' && allowedTabs.includes('tasks') && (
            <TasksTab
              isManagement={isManagement}
              isSuperAdmin={isSuperAdmin}
              initialTaskId={deepLinkTaskId}
            />
          )}
          {activeTab === 'tickets' && allowedTabs.includes('tickets') && (
            <TicketsTab isManagement={isManagement} userRole={user?.role} userEmail={user?.email} />
          )}
        </div>
      </div>
    </>
  );
}
