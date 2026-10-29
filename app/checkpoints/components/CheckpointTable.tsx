'use client';

import React, { useEffect, useState } from 'react';
import type { CheckpointItem, SignOffColumn } from '@/shared/types/checkpoint';
import { signerCaption } from '../checkpointAccess';
import CheckpointCheckbox from './SignoffSwitch';

interface CheckpointTableProps {
  moduleName: string;
  items: CheckpointItem[];
  query: string;
  canManage: boolean;
  canEdit: boolean;
  pendingKey: string | null;
  onClearQuery: () => void;
  onSignOff: (item: CheckpointItem, column: SignOffColumn, checked: boolean) => void;
  onRemark: (item: CheckpointItem, remark: string) => Promise<boolean>;
  onEdit: (item: CheckpointItem) => void;
  onDelete: (item: CheckpointItem) => void;
  onLogs: (item: CheckpointItem) => void;
}

const head =
  'sticky top-0 z-20 h-11 border border-[#c8ccd3] bg-[#f3f4f6] px-2 text-left align-middle text-[13px] font-semibold leading-4 text-[#1f2937] dark:border-[#3a3a3c] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]';
const cell = 'border border-[#d5d8de] p-0 align-middle dark:border-[#3a3a3c]';
const active = 'focus-within:relative focus-within:z-[4] focus-within:shadow-[inset_0_0_0_2px_rgb(132,90,223)]';

/**
 * Background shared by a body row and its frozen cells so the sticky columns stay opaque.
 */
function rowTone(index: number): string {
  return index % 2 === 0
    ? 'bg-white group-hover:bg-[#eef2f8] dark:bg-[#1c1c1e] dark:group-hover:bg-[#2a2a2e]'
    : 'bg-[#f4f6f8] group-hover:bg-[#eef2f8] dark:bg-[#242428] dark:group-hover:bg-[#2a2a2e]';
}

/**
 * Pendency note. Saves on blur, and only while Implemented is No.
 */
function RemarkCell({
  item,
  disabled,
  onSave,
}: {
  item: CheckpointItem;
  disabled: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(item.pendencyRemark || '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setValue(item.pendencyRemark || '');
    setStatus('idle');
  }, [item.id, item.pendencyRemark]);

  if (item.implemented !== false) {
    return <span className="block px-2 py-2 text-[13px] text-[#374151] dark:text-[#d1d1d6]">Not required</span>;
  }

  /**
   * Writes the note when the field blurs and the text actually changed.
   */
  const commit = async () => {
    if (value === (item.pendencyRemark || '')) return;
    setStatus('saving');
    const ok = await onSave(value);
    setStatus(ok ? 'saved' : 'error');
  };

  const statusText = status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Could not save' : '';

  return (
    <div className="flex min-h-11 flex-col">
      <textarea
        value={value}
        disabled={disabled}
        rows={2}
        placeholder="What is still open"
        aria-label={`Pendency for ${item.title}`}
        className="min-h-[3.25rem] w-full min-w-[14rem] resize-y border-0 bg-transparent px-2 py-1.5 text-[13px] leading-5 text-[#111827] placeholder:text-[#6b7280] focus:outline-none disabled:bg-[#f4f6f8] dark:text-[#f5f5f7] dark:disabled:bg-[#2c2c2e]"
        onChange={(event) => {
          setValue(event.target.value);
          setStatus('idle');
        }}
        onBlur={() => {
          void commit();
        }}
      />
      {statusText ? (
        <span className={`px-2 pb-1 text-[12px] leading-4 ${status === 'error' ? 'text-[#991b1b]' : 'text-[#374151] dark:text-[#d1d1d6]'}`} role="status">
          {statusText}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Yes / No for Implemented. Neither choice is selected until someone answers.
 */
function ImplementedCell({
  item,
  disabled,
  pending,
  onSignOff,
}: {
  item: CheckpointItem;
  disabled: boolean;
  pending: boolean;
  onSignOff: (checked: boolean) => void;
}) {
  const choice = (value: boolean, word: string) => {
    const on = item.implemented === value;
    return (
      <label
        className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 px-1 text-[13px] font-semibold ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        } ${on && value ? 'bg-[#dcfce7] text-[#14532d] dark:bg-[#052e16] dark:text-[#bbf7d0]' : ''} ${
          on && !value ? 'bg-[#fee2e2] text-[#7f1d1d] dark:bg-[#3f1212] dark:text-[#fecaca]' : ''
        } ${!on ? 'text-[#1f2937] dark:text-[#f5f5f7]' : ''}`}
      >
        <input
          type="radio"
          name={`implemented-${item.id}`}
          checked={on}
          disabled={disabled || pending}
          className="h-5 w-5 border-[#4b5563] text-[#166534] focus:outline-none focus:ring-0"
          onChange={() => onSignOff(value)}
        />
        {pending && on ? 'Saving…' : word}
      </label>
    );
  };

  return (
    <fieldset className="grid h-full min-h-11 grid-cols-2" aria-label={`Implemented for ${item.title}`}>
      {choice(true, 'Yes')}
      {choice(false, 'No')}
    </fieldset>
  );
}

interface SheetRow {
  item: CheckpointItem;
  row: number;
}

/**
 * Keeps the original sheet row number when a filter hides other rows.
 */
function visibleRows(items: CheckpointItem[], query: string): SheetRow[] {
  const needle = query.trim().toLowerCase();
  return items
    .map((item, index) => ({ item, row: index + 1 }))
    .filter(({ item }) => {
      if (!needle) return true;
      const haystack = `${item.title} ${item.description || ''} ${item.pendencyRemark || ''}`.toLowerCase();
      return haystack.includes(needle);
    });
}

/**
 * Spreadsheet for one module. Row numbers and the feature column stay frozen.
 */
export default function CheckpointTable({
  moduleName,
  items,
  query,
  canManage,
  canEdit,
  pendingKey,
  onClearQuery,
  onSignOff,
  onRemark,
  onEdit,
  onDelete,
  onLogs,
}: CheckpointTableProps) {
  const rows = visibleRows(items, query);

  if (items.length === 0) {
    return <p className="px-4 py-8 text-[13px] text-[#374151] dark:text-[#d1d1d6]">No checkpoints in this module yet. Add one to start the sheet.</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-8">
        <p className="text-[13px] text-[#1f2937] dark:text-[#f5f5f7]">No rows match “{query.trim()}”.</p>
        <button
          type="button"
          className="mt-2 min-h-8 rounded-md px-2 text-[13px] font-semibold text-[rgb(132,90,223)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(132,90,223)]"
          onClick={onClearQuery}
        >
          Clear filter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <p className="sr-only" aria-live="polite">
        {rows.length} of {items.length} rows in {moduleName}
      </p>
      <table className="w-full border-separate border-spacing-0 text-left">
        <caption className="sr-only">{moduleName} checkpoints</caption>
        <thead>
          <tr>
            <th scope="col" aria-label="Row" className={`${head} left-0 z-30 w-11 bg-[#e8eaee] text-center dark:bg-[#323236]`}>
              <span aria-hidden>#</span>
            </th>
            <th scope="col" className={`${head} left-11 z-30 min-w-[14rem] shadow-[2px_0_0_#c8ccd3] dark:shadow-[2px_0_0_#3a3a3c]`}>
              Checklist
            </th>
            <th scope="col" className={`${head} w-[7.25rem] text-center`}>Developed</th>
            <th scope="col" className={`${head} w-[8rem] text-center`}>Tested by Odin</th>
            <th scope="col" className={`${head} w-[8.25rem] text-center`}>Tested by Addon</th>
            <th scope="col" className={`${head} w-[8.5rem] text-center`}>Implemented</th>
            <th scope="col" className={`${head} min-w-[12rem]`}>Pendencies</th>
            <th scope="col" className={`${head} w-[1%] whitespace-nowrap`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, row }, index) => {
            const tone = rowTone(index);
            const busy = (column: SignOffColumn) => pendingKey === `${item.id}:${column}`;
            return (
              <tr key={item.id} className="group">
                <td className={`${cell} sticky left-0 z-[2] w-11 bg-[#e8eaee] text-center text-[13px] font-medium tabular-nums text-[#374151] group-hover:bg-[#dde3ea] dark:bg-[#323236] dark:text-[#d1d1d6] dark:group-hover:bg-[#3a3a3c]`}>
                  {row}
                </td>
                <th scope="row" className={`${cell} sticky left-11 z-[2] min-w-[14rem] px-2 py-1.5 text-left shadow-[2px_0_0_#c8ccd3] dark:shadow-[2px_0_0_#3a3a3c] ${tone}`}>
                  <div className="text-[13px] font-semibold leading-5 text-[#111827] dark:text-[#f5f5f7]">{item.title}</div>
                  {item.description ? (
                    <p title={item.description} className="mt-0.5 line-clamp-2 text-[13px] font-normal leading-5 text-[#374151] dark:text-[#d1d1d6]">
                      {item.description}
                    </p>
                  ) : null}
                </th>
                <td className={`${cell} ${active} ${tone}`} title={signerCaption(item.developedCheckedByName, item.developedCheckedAt)}>
                  <CheckpointCheckbox
                    checked={item.developedChecked}
                    disabled={!canEdit}
                    pending={busy('developed')}
                    label={`Developed for ${item.title}`}
                    signerName={item.developedCheckedByName}
                    signerDetail={item.developedCheckedByName ? signerCaption(item.developedCheckedByName, item.developedCheckedAt) : ''}
                    onChange={(checked) => onSignOff(item, 'developed', checked)}
                  />
                </td>
                <td className={`${cell} ${active} ${tone}`} title={signerCaption(item.testedOdinCheckedByName, item.testedOdinCheckedAt)}>
                  <CheckpointCheckbox
                    checked={item.testedOdinChecked}
                    disabled={!canEdit}
                    pending={busy('testedOdin')}
                    label={`Tested by Odin for ${item.title}`}
                    signerName={item.testedOdinCheckedByName}
                    signerDetail={item.testedOdinCheckedByName ? signerCaption(item.testedOdinCheckedByName, item.testedOdinCheckedAt) : ''}
                    onChange={(checked) => onSignOff(item, 'testedOdin', checked)}
                  />
                </td>
                <td className={`${cell} ${active} ${tone}`} title={signerCaption(item.testedAddonCheckedByName, item.testedAddonCheckedAt)}>
                  <CheckpointCheckbox
                    checked={item.testedAddonChecked}
                    disabled={!canEdit}
                    pending={busy('testedAddon')}
                    label={`Tested by Addon for ${item.title}`}
                    signerName={item.testedAddonCheckedByName}
                    signerDetail={item.testedAddonCheckedByName ? signerCaption(item.testedAddonCheckedByName, item.testedAddonCheckedAt) : ''}
                    onChange={(checked) => onSignOff(item, 'testedAddon', checked)}
                  />
                </td>
                <td className={`${cell} ${active} ${tone}`} title={signerCaption(item.implementedByName, item.implementedAt)}>
                  <ImplementedCell
                    item={item}
                    disabled={!canEdit}
                    pending={busy('implemented')}
                    onSignOff={(checked) => onSignOff(item, 'implemented', checked)}
                  />
                  {item.implementedByName ? (
                    <p className="truncate px-1 pb-1 text-center text-[12px] leading-4 text-[#374151] dark:text-[#d1d1d6]" title={signerCaption(item.implementedByName, item.implementedAt)}>
                      {item.implementedByName}
                    </p>
                  ) : null}
                </td>
                <td className={`${cell} ${active} ${tone} text-left`}>
                  <RemarkCell item={item} disabled={!canEdit} onSave={(remark) => onRemark(item, remark)} />
                </td>
                <td className={`${cell} ${tone} px-1`}>
                  <div className="flex items-center gap-0.5 whitespace-nowrap">
                    {canManage ? (
                      <button type="button" className="min-h-8 rounded px-2 text-[13px] font-semibold text-[#1f2937] hover:bg-[#e5e7eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(132,90,223)] dark:text-[#f5f5f7] dark:hover:bg-[#3a3a3c]" onClick={() => onEdit(item)}>
                        Edit…
                      </button>
                    ) : null}
                    <button type="button" className="min-h-8 rounded px-2 text-[13px] font-semibold text-[#1f2937] hover:bg-[#e5e7eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(132,90,223)] dark:text-[#f5f5f7] dark:hover:bg-[#3a3a3c]" onClick={() => onLogs(item)} aria-label={`View log for ${item.title}`}>
                      Log
                    </button>
                    {canManage ? (
                      <button type="button" className="min-h-8 rounded px-2 text-[13px] font-semibold text-[#991b1b] hover:bg-[#fee2e2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b] dark:text-[#fca5a5] dark:hover:bg-[#3f1212]" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
