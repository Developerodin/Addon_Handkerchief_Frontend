'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Seo from '@/shared/layout-components/seo/seo';
import { isManagementSide, isDevTeamSide, isHelpSupportSuperAdmin } from './helpSupportConstants';
import FilesTab from './components/FilesTab';
import TasksTab from './components/TasksTab';
import TicketsTab from './components/TicketsTab';

type HubTab = 'files' | 'tasks' | 'tickets';

/**
 * Handkerchief Help & Support hub — Files, Tasks, Tickets.
 */
export default function HelpAndSupportPage() {
  const user = useSelector(
    (state: { auth?: { user?: { role?: string; email?: string } } }) => state.auth?.user
  );
  const isManagement = isManagementSide(user?.role, user?.email);
  const isDev = isDevTeamSide(user?.role);
  const isSuperAdmin = isHelpSupportSuperAdmin(user?.role, user?.email);

  const [activeTab, setActiveTab] = useState<HubTab>('files');

  const sideLabel = isManagement ? 'Management' : isDev ? 'Dev team' : 'Collaboration';

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
            {(['files', 'tasks', 'tickets'] as HubTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 px-4 py-2 text-xs font-bold capitalize ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'files' && <FilesTab isManagement={isManagement} />}
          {activeTab === 'tasks' && <TasksTab isManagement={isManagement} isSuperAdmin={isSuperAdmin} />}
          {activeTab === 'tickets' && (
            <TicketsTab isManagement={isManagement} userRole={user?.role} userEmail={user?.email} />
          )}
        </div>
      </div>
    </>
  );
}
