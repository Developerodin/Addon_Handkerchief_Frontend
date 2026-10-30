'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import CheckpointConfirmDialog from './components/CheckpointConfirmDialog';
import CheckpointFormModal from './components/CheckpointFormModal';
import CheckpointLogDrawer from './components/CheckpointLogDrawer';
import CheckpointWorkbook from './components/CheckpointWorkbook';
import { signOffDialogCopy } from './checkpointAccess';
import { useCheckpointsPage } from './useCheckpointsPage';

/**
 * Checkpoint workbook. Each module is a sheet of feature rows.
 */
export default function CheckpointsPage() {
  const page = useCheckpointsPage();
  const selected = page.modules.find((module) => module.id === page.selectedId) || null;

  return (
    <div className="flex h-[calc(100dvh-3.75rem)] min-h-[32rem] flex-col overflow-hidden bg-[#eef0f3] px-4 dark:bg-[#111113]">
      <Seo title="Checkpoints" />
      <Toaster position="top-right" />
      <header className="flex items-end justify-between gap-3 pb-2 pt-3">
        <div>
          <h1 className="text-[17px] font-semibold leading-6 text-[#111827] dark:text-[#f5f5f7]">Checkpoints</h1>
          <p className="text-[13px] leading-5 text-[#374151] dark:text-[#d1d1d6]">
            Each module is a sheet. A No on Implemented needs a pendency note.
          </p>
        </div>
      </header>

      {page.loading ? (
        <div className="mb-3 flex-1 rounded-lg border border-[#c8ccd3] bg-white p-4 dark:border-[#3a3a3c] dark:bg-[#1c1c1e]" role="status" aria-label="Loading checkpoints">
          <p className="text-[13px] text-[#374151] dark:text-[#d1d1d6]">Loading checkpoints…</p>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-11 rounded bg-[#e8eaee] motion-safe:animate-pulse dark:bg-[#2c2c2e]" />
            ))}
          </div>
        </div>
      ) : null}

      {page.error ? (
        <p className="mb-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#991b1b]" role="alert">
          {page.error}
        </p>
      ) : null}

      {!page.loading && page.modules.length === 0 ? (
        <div className="mb-3 rounded-lg border border-dashed border-[#c8ccd3] bg-white px-4 py-10 text-center dark:border-[#3a3a3c] dark:bg-[#1c1c1e]">
          <p className="text-[15px] font-semibold text-[#111827] dark:text-[#f5f5f7]">No modules yet</p>
          <p className="mt-1 text-[13px] text-[#374151] dark:text-[#d1d1d6]">Add a module, then add the checkpoints inside it.</p>
          {page.canManage ? (
            <button
              type="button"
              className="mt-4 inline-flex min-h-8 items-center rounded-md bg-[rgb(132,90,223)] px-3 text-[13px] font-semibold text-white hover:bg-[rgb(118,74,214)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(132,90,223)] focus-visible:ring-offset-2"
              onClick={() => page.setForm({ kind: 'module', name: '' })}
            >
              New module
            </button>
          ) : null}
        </div>
      ) : null}

      {!page.loading && selected ? (
        <CheckpointWorkbook
          modules={page.modules}
          selected={selected}
          canManage={page.canManage}
          canEdit={page.canEdit}
          pendingKey={page.pendingKey}
          onSelect={page.setSelectedId}
          onAddModule={() => page.setForm({ kind: 'module', name: '' })}
          onAddItem={() => page.setForm({ kind: 'item', moduleId: selected.id, title: '', description: '' })}
          onRename={() => page.setForm({ kind: 'module', moduleId: selected.id, name: selected.name })}
          onDeleteModule={() => page.setConfirm({ kind: 'module', module: selected })}
          onSignOff={(item, column, checked) => page.setSignOffRequest({ item, column, checked })}
          onRemark={page.saveRemark}
          onEdit={(item) =>
            page.setForm({
              kind: 'item',
              itemId: item.id,
              moduleId: item.moduleId,
              title: item.title,
              description: item.description || '',
            })
          }
          onDelete={(item) => page.setConfirm({ kind: 'item', item })}
          onLogs={page.setLogItem}
        />
      ) : null}

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
