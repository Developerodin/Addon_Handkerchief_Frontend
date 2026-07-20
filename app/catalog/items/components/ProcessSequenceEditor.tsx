'use client';

import React, { useCallback, useRef, useState } from 'react';

export interface ProcessSequenceItem {
  processId: string;
}

export interface ProcessOption {
  id: string;
  name: string;
  type?: string;
  description?: string;
}

interface ProcessSequenceEditorProps {
  items: ProcessSequenceItem[];
  availableProcesses: ProcessOption[];
  onChange: (items: ProcessSequenceItem[]) => void;
  disabled?: boolean;
}

function resolveProcessId(
  processId: string | { id?: string } | null | undefined
): string {
  if (!processId) return '';
  if (typeof processId === 'object' && 'id' in processId) {
    return String((processId as { id: string }).id);
  }
  return String(processId);
}

function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

function InsertStepDivider({
  onInsert,
  disabled,
  label,
}: {
  onInsert: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="group relative flex h-5 items-center justify-center">
      <div className="absolute inset-x-4 top-1/2 h-px bg-gray-100 transition-colors group-hover:bg-violet-200 dark:bg-white/10 dark:group-hover:bg-violet-500/40" />
      <button
        type="button"
        onClick={onInsert}
        disabled={disabled}
        className="relative z-[1] inline-flex items-center gap-1 rounded-full border border-transparent bg-white px-2.5 py-0.5 text-[11px] font-medium text-violet-600 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
        aria-label={label}
      >
        <i className="ri-add-line text-xs" aria-hidden />
        Insert step
      </button>
    </div>
  );
}

export function ProcessSequenceEditor({
  items,
  availableProcesses,
  onChange,
  disabled = false,
}: ProcessSequenceEditorProps) {
  const dragFromIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const displayItems = items.length > 0 ? items : [{ processId: '' }];
  const filledCount = displayItems.filter((item) => resolveProcessId(item.processId)).length;

  const handleInsertAt = useCallback(
    (index: number) => {
      const next = [...displayItems];
      next.splice(index, 0, { processId: '' });
      onChange(next);
    },
    [displayItems, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      if (displayItems.length <= 1) {
        onChange([{ processId: '' }]);
        return;
      }
      onChange(displayItems.filter((_, i) => i !== index));
    },
    [displayItems, onChange]
  );

  const handleProcessSelect = useCallback(
    (index: number, value: string) => {
      const next = [...displayItems];
      next[index] = { processId: value };
      onChange(next);
    },
    [displayItems, onChange]
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= displayItems.length || fromIndex === toIndex) return;
      onChange(reorderList(displayItems, fromIndex, toIndex));
    },
    [displayItems, onChange]
  );

  const handleDrop = useCallback(
    (toIndex: number) => {
      const from = dragFromIndexRef.current;
      if (from === null || from === toIndex) return;
      onChange(reorderList(displayItems, from, toIndex));
      dragFromIndexRef.current = null;
      setDraggingIndex(null);
    },
    [displayItems, onChange]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/60 dark:border-white/10 dark:bg-slate-900/40">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-900 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Production Process Sequence
              </h4>
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                {filledCount} / {displayItems.length} configured
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Define the serial manufacturing flow. Steps run from top to bottom — drag rows, use arrows,
              or insert a step between existing ones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleInsertAt(displayItems.length)}
            disabled={disabled}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i className="ri-add-line text-base" aria-hidden />
            Add step
          </button>
        </div>
      </div>

      <div className="hidden grid-cols-[52px_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_88px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-gray-400 lg:grid sm:px-5">
        <div>Step</div>
        <div>Process</div>
        <div>Type</div>
        <div>Description</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="px-3 py-3 sm:px-4" role="list" aria-label="Production process sequence">
        {displayItems.map((item, index) => {
          const currentProcessId = resolveProcessId(item.processId as string | { id?: string });
          const selectedProcess = availableProcesses.find((p) => p.id === currentProcessId);
          const isDragging = draggingIndex === index;
          const canDrag = !disabled && displayItems.length > 1;
          const isLast = index === displayItems.length - 1;

          return (
            <React.Fragment key={`process-step-${index}`}>
              {index > 0 && (
                <InsertStepDivider
                  onInsert={() => handleInsertAt(index)}
                  disabled={disabled}
                  label={`Insert new process before step ${index + 1}`}
                />
              )}

              <div
                role="listitem"
                draggable={canDrag}
                aria-grabbed={canDrag ? isDragging : undefined}
                onDragStart={(e) => {
                  if (!canDrag) return;
                  dragFromIndexRef.current = index;
                  setDraggingIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(index));
                }}
                onDragEnd={() => {
                  dragFromIndexRef.current = null;
                  setDraggingIndex(null);
                }}
                onDragOver={(e) => {
                  if (dragFromIndexRef.current === null || disabled) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(index);
                }}
                className={`relative rounded-xl border bg-white p-3 shadow-sm transition-all dark:bg-slate-900 sm:p-4 ${
                  isDragging
                    ? 'border-violet-300 opacity-70 ring-2 ring-violet-200 dark:border-violet-500/50 dark:ring-violet-500/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20'
                } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[52px_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_88px] lg:items-center lg:gap-3">
                  <div className="flex items-center gap-3 lg:flex-col lg:gap-1">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                      aria-label={`Step ${index + 1}`}
                    >
                      {index + 1}
                    </span>
                    {canDrag && (
                      <span
                        className="hidden text-gray-400 lg:inline-flex"
                        title="Drag to reorder"
                        aria-hidden
                      >
                        <i className="ri-draggable text-lg" />
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-400 lg:hidden">Step {index + 1}</span>
                  </div>

                  <div>
                    <label htmlFor={`process-select-${index}`} className="mb-1 block text-xs font-medium text-gray-500 lg:sr-only">
                      Process for step {index + 1}
                    </label>
                    <select
                      id={`process-select-${index}`}
                      className="form-control !rounded-lg !border-gray-200 !py-2.5 text-sm focus:!border-violet-400 focus:!ring-violet-400/20 dark:!border-white/10"
                      value={currentProcessId}
                      onChange={(e) => handleProcessSelect(index, e.target.value)}
                      disabled={disabled}
                    >
                      <option value="">Select process…</option>
                      {availableProcesses.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-medium text-gray-500 lg:hidden">Type</span>
                    <div className="min-h-[42px] rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-white/5 dark:bg-slate-800/50 dark:text-gray-200">
                      {selectedProcess?.type || (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-medium text-gray-500 lg:hidden">Description</span>
                    <div
                      className="min-h-[42px] rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-white/5 dark:bg-slate-800/50 dark:text-gray-200"
                      title={selectedProcess?.description || undefined}
                    >
                      {selectedProcess?.description ? (
                        <span className="line-clamp-2">{selectedProcess.description}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => handleMove(index, index - 1)}
                      disabled={disabled || index === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-violet-500/10"
                      aria-label={`Move step ${index + 1} up`}
                    >
                      <i className="ri-arrow-up-s-line text-base" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, index + 1)}
                      disabled={disabled || index === displayItems.length - 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-violet-500/10"
                      aria-label={`Move step ${index + 1} down`}
                    >
                      <i className="ri-arrow-down-s-line text-base" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      disabled={disabled}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/20 dark:hover:bg-red-500/10"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      <i className="ri-delete-bin-line text-base" aria-hidden />
                    </button>
                  </div>
                </div>

                {!isLast && (
                  <div className="pointer-events-none absolute -bottom-3 left-[2.05rem] hidden h-3 w-px bg-violet-200 lg:block dark:bg-violet-500/30" />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {filledCount === 0 && (
        <div className="border-t border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/10">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            <i className="ri-route-line text-lg" aria-hidden />
          </div>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">No processes selected yet</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Choose a process for each step to build your production sequence.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 dark:border-white/10 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>
          {displayItems.length} step{displayItems.length === 1 ? '' : 's'} in sequence
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          Drag rows or use arrows to reorder
        </span>
      </div>
    </div>
  );
}
