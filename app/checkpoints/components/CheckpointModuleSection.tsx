'use client';

import React from 'react';
import type { CheckpointModule } from '@/shared/types/checkpoint';

interface CheckpointSheetTabsProps {
  modules: CheckpointModule[];
  selectedId: string;
  canManage: boolean;
  onSelect: (moduleId: string) => void;
  onAddModule: () => void;
}

/**
 * Workbook tabs. Each module is one sheet. Arrow keys move between sheets.
 */
export default function CheckpointSheetTabs({
  modules,
  selectedId,
  canManage,
  onSelect,
  onAddModule,
}: CheckpointSheetTabsProps) {
  /**
   * Moves selection to the next or previous sheet and focuses that tab.
   */
  const moveTab = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const current = modules.findIndex((module) => module.id === selectedId);
    if (current < 0) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = modules[(current + delta + modules.length) % modules.length];
    onSelect(next.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`checkpoint-tab-${next.id}`)?.focus();
    });
  };

  return (
    <div
      role="tablist"
      aria-label="Checkpoint modules"
      className="flex items-end gap-0.5 overflow-x-auto border-t border-[#c8ccd3] bg-[#e8eaee] px-2 pt-1 dark:border-[#3a3a3c] dark:bg-[#2c2c2e]"
      onKeyDown={moveTab}
    >
      {modules.map((module) => {
        const selected = module.id === selectedId;
        const done = module.items.filter((item) => item.complete).length;
        return (
          <button
            key={module.id}
            id={`checkpoint-tab-${module.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="checkpoint-sheet"
            tabIndex={selected ? 0 : -1}
            className={`mb-0 shrink-0 rounded-t-md px-3 py-2 text-[13px] leading-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(132,90,223)] ${
              selected
                ? 'border border-b-white bg-white font-semibold text-[#111827] dark:border-[#3a3a3c] dark:border-b-[#1c1c1e] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]'
                : 'border border-transparent font-medium text-[#374151] hover:bg-[#f4f6f8] dark:text-[#d1d1d6] dark:hover:bg-[#3a3a3c]'
            }`}
            onClick={() => onSelect(module.id)}
          >
            {module.name}
            <span className="ms-2 font-normal tabular-nums text-[#374151] dark:text-[#d1d1d6]">
              {done}/{module.items.length}
            </span>
          </button>
        );
      })}
      {canManage ? (
        <button
          type="button"
          className="mb-1 ms-1 min-h-8 shrink-0 rounded-md px-2.5 text-[13px] font-semibold text-[#374151] hover:bg-[#f4f6f8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(132,90,223)] dark:text-[#d1d1d6] dark:hover:bg-[#3a3a3c]"
          onClick={onAddModule}
        >
          New module
        </button>
      ) : null}
    </div>
  );
}
