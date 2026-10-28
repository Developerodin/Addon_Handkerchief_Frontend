'use client';

import React, { useState } from 'react';
import type { CheckpointItem, CheckpointModule, SignOffColumn } from '@/shared/types/checkpoint';
import CheckpointTable from './CheckpointTable';

interface CheckpointModuleSectionProps {
  module: CheckpointModule;
  canManage: boolean;
  canDeveloper: boolean;
  canAddon: boolean;
  pendingKey: string | null;
  onSignOff: (item: CheckpointItem, column: SignOffColumn, checked: boolean) => void;
  onEditItem: (item: CheckpointItem) => void;
  onDeleteItem: (item: CheckpointItem) => void;
  onLogs: (item: CheckpointItem) => void;
  onAddItem: (moduleId: string) => void;
  onEditModule: (module: CheckpointModule) => void;
  onDeleteModule: (module: CheckpointModule) => void;
}

/**
 * One module accordion. Closed until the header is clicked, then the checkpoints show.
 */
export default function CheckpointModuleSection({
  module,
  canManage,
  canDeveloper,
  canAddon,
  pendingKey,
  onSignOff,
  onEditItem,
  onDeleteItem,
  onLogs,
  onAddItem,
  onEditModule,
  onDeleteModule,
}: CheckpointModuleSectionProps) {
  const [open, setOpen] = useState(false);
  const done = module.items.filter((item) => item.complete).length;
  const panelId = `module-panel-${module.id}`;

  /**
   * Keeps Add, Rename, and Delete from also opening or closing the accordion.
   */
  const stopToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${open ? 'border-b border-gray-100' : ''}`}>
        <button
          type="button"
          id={`module-${module.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <i
            className={`ri-arrow-right-s-line text-lg text-gray-500 transition ${open ? 'rotate-90' : ''}`}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-gray-900">{module.name}</span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  module.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
                }`}
              >
                {module.complete ? 'Complete' : 'In progress'}
              </span>
            </span>
            <span className="mt-1 block text-xs font-normal text-gray-500">
              {done} of {module.items.length} checkpoints complete
            </span>
          </span>
        </button>
        {canManage ? (
          <div className="flex flex-wrap gap-2" onClick={stopToggle}>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => onAddItem(module.id)}
            >
              Add checkpoint
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => onEditModule(module)}
            >
              Rename
            </button>
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              onClick={() => onDeleteModule(module)}
            >
              Delete
            </button>
          </div>
        ) : null}
      </header>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={`module-${module.id}`}>
          <CheckpointTable
            items={module.items}
            canManage={canManage}
            canDeveloper={canDeveloper}
            canAddon={canAddon}
            pendingKey={pendingKey}
            onSignOff={onSignOff}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
            onLogs={onLogs}
          />
        </div>
      ) : null}
    </section>
  );
}
