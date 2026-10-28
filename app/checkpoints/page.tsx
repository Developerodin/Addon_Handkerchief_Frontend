'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import CheckpointConfirmDialog from './components/CheckpointConfirmDialog';
import CheckpointFormModal from './components/CheckpointFormModal';
import CheckpointLogDrawer from './components/CheckpointLogDrawer';
import CheckpointModuleSection from './components/CheckpointModuleSection';
import { signOffDialogCopy } from './checkpointAccess';
import { useCheckpointsPage } from './useCheckpointsPage';

/**
 * Software checkpoint list: modules, sign-off switches, and a complete column.
 */
export default function CheckpointsPage() {
  const page = useCheckpointsPage();

  return (
    <div className="px-4 py-4 md:px-6">
      <Seo title="Checkpoints" />
      <Toaster position="top-right" />
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Checkpoints</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Track software modules. Developer and Addon each sign off. A checkpoint, and its module, are complete only when both are on.
          </p>
        </div>
        {page.canManage ? (
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={() => page.setForm({ kind: 'module', name: '' })}
          >
            New module
          </button>
        ) : null}
      </header>

      {page.loading ? (
        <p className="text-sm text-gray-500" role="status">
          Loading checkpoints…
        </p>
      ) : null}

      {page.error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {page.error}
        </p>
      ) : null}

      {!page.loading && page.modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-gray-900">No modules yet</p>
          <p className="mt-1 text-sm text-gray-500">Add a module, then add the checkpoints inside it.</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {page.modules.map((module) => (
          <CheckpointModuleSection
            key={module.id}
            module={module}
            canManage={page.canManage}
            canDeveloper={page.canDeveloper}
            canAddon={page.canAddon}
            pendingKey={page.pendingKey}
            onSignOff={(item, column, checked) => page.setSignOffRequest({ item, column, checked })}
            onEditItem={(item) =>
              page.setForm({
                kind: 'item',
                itemId: item.id,
                moduleId: item.moduleId,
                title: item.title,
                description: item.description || '',
              })
            }
            onDeleteItem={(item) => page.setConfirm({ kind: 'item', item })}
            onLogs={page.setLogItem}
            onAddItem={(moduleId) =>
              page.setForm({ kind: 'item', moduleId, title: '', description: '' })
            }
            onEditModule={(current) =>
              page.setForm({ kind: 'module', moduleId: current.id, name: current.name })
            }
            onDeleteModule={(current) => page.setConfirm({ kind: 'module', module: current })}
          />
        ))}
      </div>

      {page.form ? (
        <CheckpointFormModal mode={page.form} onClose={() => page.setForm(null)} onSubmit={page.submitForm} />
      ) : null}

      {page.confirm ? (
        <CheckpointConfirmDialog
          title={page.confirm.kind === 'module' ? 'Delete module' : 'Delete checkpoint'}
          message={
            page.confirm.kind === 'module'
              ? `Delete “${page.confirm.module.name}” and every checkpoint in it? This also removes their logs.`
              : `Delete “${page.confirm.item.title}”? Its sign-off log is removed too.`
          }
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          pending={page.confirming}
          onClose={() => {
            if (!page.confirming) page.setConfirm(null);
          }}
          onConfirm={page.confirmDelete}
        />
      ) : null}

      {page.signOffRequest ? (
        <CheckpointConfirmDialog
          {...signOffDialogCopy(page.signOffRequest)}
          pendingLabel="Saving…"
          pending={Boolean(page.pendingKey)}
          onClose={() => {
            if (!page.pendingKey) page.setSignOffRequest(null);
          }}
          onConfirm={page.confirmSignOff}
        />
      ) : null}

      {page.logItem ? (
        <CheckpointLogDrawer item={page.logItem} onClose={() => page.setLogItem(null)} />
      ) : null}
    </div>
  );
}
