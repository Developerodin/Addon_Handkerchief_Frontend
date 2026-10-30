'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { CheckpointItem, CheckpointModule, SignOffColumn } from '@/shared/types/checkpoint';
import CheckpointSheetBar from './CheckpointSheetBar';
import CheckpointSheetTabs from './CheckpointModuleSection';
import CheckpointTable from './CheckpointTable';

interface CheckpointWorkbookProps {
  modules: CheckpointModule[];
  selected: CheckpointModule;
  canManage: boolean;
  canEdit: boolean;
  pendingKey: string | null;
  onSelect: (moduleId: string) => void;
  onAddModule: () => void;
  onAddItem: () => void;
  onRename: () => void;
  onDeleteModule: () => void;
  onSignOff: (item: CheckpointItem, column: SignOffColumn, checked: boolean) => void;
  onRemark: (item: CheckpointItem, remark: string) => Promise<boolean>;
  onEdit: (item: CheckpointItem) => void;
  onDelete: (item: CheckpointItem) => void;
  onLogs: (item: CheckpointItem) => void;
}

/**
 * One module as a sheet: toolbar, frozen grid, and workbook tabs.
 */
export default function CheckpointWorkbook({
  modules,
  selected,
  canManage,
  canEdit,
  pendingKey,
  onSelect,
  onAddModule,
  onAddItem,
  onRename,
  onDeleteModule,
  onSignOff,
  onRemark,
  onEdit,
  onDelete,
  onLogs,
}: CheckpointWorkbookProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    setQuery('');
  }, [selected.id]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return selected.items.length;
    return selected.items.filter((item) =>
      `${item.title} ${item.description || ''} ${item.pendencyRemark || ''}`.toLowerCase().includes(needle)
    ).length;
  }, [query, selected.items]);

  const done = selected.items.filter((item) => item.complete).length;

  return (
    <section
      className="mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#c8ccd3] bg-white shadow-sm dark:border-[#3a3a3c] dark:bg-[#1c1c1e]"
      aria-label={`${selected.name} checklist`}
    >
      <CheckpointSheetBar
        name={selected.name}
        done={done}
        total={selected.items.length}
        shown={shown}
        query={query}
        canManage={canManage}
        onQuery={setQuery}
        onAdd={onAddItem}
        onRename={onRename}
        onDelete={onDeleteModule}
      />
      <div id="checkpoint-sheet" role="tabpanel" aria-labelledby={`checkpoint-tab-${selected.id}`} className="flex min-h-0 flex-1 flex-col">
        <CheckpointTable
          moduleName={selected.name}
          items={selected.items}
          query={query}
          canManage={canManage}
          canEdit={canEdit}
          pendingKey={pendingKey}
          onClearQuery={() => setQuery('')}
          onSignOff={onSignOff}
          onRemark={onRemark}
          onEdit={onEdit}
          onDelete={onDelete}
          onLogs={onLogs}
        />
      </div>
      <CheckpointSheetTabs
        modules={modules}
        selectedId={selected.id}
        canManage={canManage}
        onSelect={onSelect}
        onAddModule={onAddModule}
      />
    </section>
  );
}
