'use client';

import React from 'react';
import type { CheckpointModule } from '@/shared/types/checkpoint';

interface CheckpointModuleCardsProps {
  modules: CheckpointModule[];
  selectedId: string;
  canManage: boolean;
  onSelect: (moduleId: string) => void;
  onAddItem: (moduleId: string) => void;
  onEditModule: (module: CheckpointModule) => void;
  onDeleteModule: (module: CheckpointModule) => void;
}

/**
 * Module cards above the sheet. The selected card is the checklist that is open.
 */
export default function CheckpointModuleCards({
  modules,
  selectedId,
  canManage,
  onSelect,
  onAddItem,
  onEditModule,
  onDeleteModule,
}: CheckpointModuleCardsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1" role="list" aria-label="Checkpoint modules">
      {modules.map((module) => {
        const selected = module.id === selectedId;
        const done = module.items.filter((item) => item.complete).length;
        return (
          <article
            key={module.id}
            role="listitem"
            className={`min-w-[220px] max-w-xs shrink-0 rounded-xl border p-3 shadow-sm ${
              selected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 bg-white'
            }`}
          >
            <button
              type="button"
              aria-pressed={selected}
              className="w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => onSelect(module.id)}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{module.name}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    module.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {module.complete ? 'Complete' : 'In progress'}
                </span>
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                {done} of {module.items.length} checkpoints complete
              </span>
            </button>
            {selected && canManage ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={() => onAddItem(module.id)}
                >
                  Add checkpoint
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={() => onEditModule(module)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  onClick={() => onDeleteModule(module)}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
