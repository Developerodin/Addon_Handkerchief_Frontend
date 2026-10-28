'use client';

import React from 'react';
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
 * One software module: header with complete state, then its checkpoint table.
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
  const done = module.items.filter((item) => item.complete).length;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby={`module-${module.id}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`module-${module.id}`} className="text-base font-semibold text-gray-900">
              {module.name}
            </h2>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                module.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
              }`}
            >
              {module.complete ? 'Complete' : 'In progress'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {done} of {module.items.length} checkpoints complete
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
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
    </section>
  );
}
