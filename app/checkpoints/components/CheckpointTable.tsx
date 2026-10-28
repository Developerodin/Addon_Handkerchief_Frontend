'use client';

import React, { useEffect, useState } from 'react';
import type { CheckpointItem, SignOffColumn } from '@/shared/types/checkpoint';
import { signerCaption } from '../checkpointAccess';
import CheckpointCheckbox from './SignoffSwitch';

interface CheckpointTableProps {
  items: CheckpointItem[];
  canManage: boolean;
  canEdit: boolean;
  pendingKey: string | null;
  onSignOff: (item: CheckpointItem, column: SignOffColumn, checked: boolean) => void;
  onRemark: (item: CheckpointItem, remark: string) => void;
  onEdit: (item: CheckpointItem) => void;
  onDelete: (item: CheckpointItem) => void;
  onLogs: (item: CheckpointItem) => void;
}

const head = 'sticky top-0 z-10 border border-gray-300 bg-gray-100 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-gray-600';
const cell = 'border border-gray-300 px-2 py-2 align-middle text-center';

/**
 * Pendency text. It saves when the field loses focus, and only while Implemented is No.
 */
function RemarkCell({
  item,
  disabled,
  onSave,
}: {
  item: CheckpointItem;
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(item.pendencyRemark || '');

  useEffect(() => {
    setValue(item.pendencyRemark || '');
  }, [item.id, item.pendencyRemark]);

  if (item.implemented !== false) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <textarea
      value={value}
      disabled={disabled}
      rows={2}
      aria-label={`Pendency remark for ${item.title}`}
      className="w-full min-w-[14rem] rounded border border-gray-300 bg-white px-2 py-1 text-left text-xs text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onSave(value)}
    />
  );
}

/**
 * Excel-style checklist for the selected module.
 */
export default function CheckpointTable({
  items,
  canManage,
  canEdit,
  pendingKey,
  onSignOff,
  onRemark,
  onEdit,
  onDelete,
  onLogs,
}: CheckpointTableProps) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-sm text-gray-500">No checkpoints in this module yet.</p>;
  }

  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className={`${head} left-0 z-20 min-w-[16rem] text-left`}>Checklist</th>
            <th scope="col" className={head}>Developed</th>
            <th scope="col" className={head}>Tested by Odin</th>
            <th scope="col" className={head}>Tested by Addon team</th>
            <th scope="col" className={head}>Implemented</th>
            <th scope="col" className={`${head} min-w-[16rem] text-left`}>Pendencies</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const busy = (column: SignOffColumn) => pendingKey === `${item.id}:${column}`;
            const stripe = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            return (
              <tr key={item.id} className={stripe}>
                <th scope="row" className={`${cell} sticky left-0 z-[1] text-left ${stripe}`}>
                  <div className="font-semibold text-gray-900">{item.title}</div>
                  {item.description ? <p className="mt-1 whitespace-pre-wrap font-normal text-gray-500">{item.description}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2 font-normal">
                    {canManage ? (
                      <>
                        <button type="button" className="text-indigo-600 hover:text-indigo-800" onClick={() => onEdit(item)}>Edit</button>
                        <button type="button" className="text-red-600 hover:text-red-800" onClick={() => onDelete(item)}>Delete</button>
                      </>
                    ) : null}
                    <button type="button" className="text-gray-600 hover:text-gray-900" onClick={() => onLogs(item)} aria-label={`View log for ${item.title}`}>
                      Log
                    </button>
                  </div>
                </th>
                <td className={cell} title={signerCaption(item.developedCheckedByName, item.developedCheckedAt)}>
                  <CheckpointCheckbox
                    checked={item.developedChecked}
                    disabled={!canEdit}
                    pending={busy('developed')}
                    label={`Developed for ${item.title}`}
                    onChange={(checked) => onSignOff(item, 'developed', checked)}
                  />
                </td>
                <td className={cell} title={signerCaption(item.testedOdinCheckedByName, item.testedOdinCheckedAt)}>
                  <CheckpointCheckbox
                    checked={item.testedOdinChecked}
                    disabled={!canEdit}
                    pending={busy('testedOdin')}
                    label={`Tested by Odin for ${item.title}`}
                    onChange={(checked) => onSignOff(item, 'testedOdin', checked)}
                  />
                </td>
                <td className={cell} title={signerCaption(item.testedAddonCheckedByName, item.testedAddonCheckedAt)}>
                  <CheckpointCheckbox
                    checked={item.testedAddonChecked}
                    disabled={!canEdit}
                    pending={busy('testedAddon')}
                    label={`Tested by Addon team for ${item.title}`}
                    onChange={(checked) => onSignOff(item, 'testedAddon', checked)}
                  />
                </td>
                <td className={cell} title={signerCaption(item.implementedByName, item.implementedAt)}>
                  <fieldset className="flex items-center justify-center gap-3" aria-label={`Implemented for ${item.title}`}>
                    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700">
                      <input
                        type="radio"
                        name={`implemented-${item.id}`}
                        checked={item.implemented === true}
                        disabled={!canEdit || busy('implemented')}
                        aria-label={`Implemented yes for ${item.title}`}
                        onChange={() => onSignOff(item, 'implemented', true)}
                      />
                      Yes
                    </label>
                    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700">
                      <input
                        type="radio"
                        name={`implemented-${item.id}`}
                        checked={item.implemented === false}
                        disabled={!canEdit || busy('implemented')}
                        aria-label={`Implemented no for ${item.title}`}
                        onChange={() => onSignOff(item, 'implemented', false)}
                      />
                      No
                    </label>
                  </fieldset>
                </td>
                <td className={`${cell} text-left`}>
                  <RemarkCell item={item} disabled={!canEdit} onSave={(remark) => onRemark(item, remark)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
