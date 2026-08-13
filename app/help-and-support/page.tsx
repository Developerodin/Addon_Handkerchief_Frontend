'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Handkerchief Help & Support hub — Files, Tasks, Tickets.
 */
export default function HelpAndSupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions } = useNavigation();
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

  const [activeTab, setActiveTab] = useState<HubTab>(defaultTab);
  const canAccessTasks = canAccessHelpSupportTab(permissions, 'tasks', user?.role);
  const deepLinkTaskId = canAccessTasks ? searchParams.get('taskId') || undefined : undefined;
  const redirectedRef = useRef<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as HubTab | null;
    const taskIdParam = searchParams.get('taskId');
    const signature = `${tabParam || ''}|${taskIdParam || ''}|${allowedTabs.join(',')}`;

    const tabAllowed =
      tabParam === 'files' || tabParam === 'tasks' || tabParam === 'tickets'
        ? canAccessHelpSupportTab(permissions, tabParam, user?.role)
        : false;

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
        nextParams.toString() ? `/help-and-support?${nextParams.toString()}` : '/help-and-support'
      );
      setActiveTab(defaultTab);
      return;
    }

    redirectedRef.current = null;

    if (tabParam === 'tasks' || tabParam === 'tickets' || tabParam === 'files') {
      setActiveTab(tabParam);
      return;
    }
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [searchParams, permissions, user?.role, allowedTabs, activeTab, defaultTab, router]);

  useEffect(() => {
    if (!allowedTabs.length) {
      router.replace('/dashboards/main');
    }
  }, [allowedTabs.length, router]);

  const sideLabel = isManagement ? 'Management' : isDev ? 'Dev team' : 'Collaboration';

  if (!allowedTabs.length) {
    return null;
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
                onClick={() => setActiveTab(tab)}
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
