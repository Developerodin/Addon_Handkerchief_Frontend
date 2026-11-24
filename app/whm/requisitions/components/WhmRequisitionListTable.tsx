'use client';

import React from 'react';
import {
  canSelectForOrder,
  formatUnits,
  priorityLabel,
  workflowStageLabel,
  type WhmRequisitionPriority,
  type WhmRequisitionRow,
} from '../mockRequisitions';

const th =
  'px-2 py-2.5 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 bg-gray-50/50';

function priorityBadge(priority: WhmRequisitionPriority) {
  const map: Record<WhmRequisitionPriority, string> = {
    urgent: 'bg-red-100 text-red-800 border border-red-200',
    medium: 'bg-amber-100 text-amber-900 border border-amber-200',
    low: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${map[priority]}`}>
      {priorityLabel(priority)}
    </span>
  );
}

function workflowBadge(stage: WhmRequisitionRow['workflowStage']) {
  const map: Record<string, string> = {
    in_requisition: 'border-slate-200 bg-slate-50 text-slate-800',
    sent_to_draft: 'border-amber-200 bg-amber-50 text-amber-950',
    order_placed: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    order_created: 'border-violet-200 bg-violet-50 text-violet-900',
    dismissed: 'border-gray-200 bg-gray-50 text-gray-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded border ${map[stage] || map.in_requisition}`}>
      {workflowStageLabel(stage)}
    </span>
  );
}

type Props = {
  rows: WhmRequisitionRow[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onTogglePage: (pageIds: string[], selectAll: boolean) => void;
};

export default function WhmRequisitionListTable({ rows, selectedIds, onToggleRow, onTogglePage }: Props) {
  const selectableIds = rows.filter(canSelectForOrder).map((r) => r.id);
  const allSelectableChecked =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-[10px]">
        <i className="ri-check-double-line text-5xl text-gray-300 mb-4" aria-hidden />
        <h3 className="text-xs font-bold text-gray-400 mb-1">No matching requisitions</h3>
        <p className="text-[11px] text-gray-500">Try changing filters or search.</p>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse border border-gray-200 min-w-[760px]" aria-label="Requisition list">
      <thead>
        <tr>
          <th className={`${th} w-10 pl-[10px]`}>
            <input
              type="checkbox"
              checked={allSelectableChecked}
              onChange={() => onTogglePage(selectableIds, allSelectableChecked)}
              disabled={selectableIds.length === 0}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              aria-label="Select all materials on this page"
            />
          </th>
          <th className={th}>Material / trim</th>
          <th className={th}>Qty</th>
          <th className={th}>Live inventory</th>
          <th className={th}>Draft PO qty</th>
          <th className={th}>Alert status</th>
          <th className={th}>Status</th>
          <th className={th}>Last updated</th>
          <th className={`${th} text-right pr-[10px]`}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const selectable = canSelectForOrder(row);
          const checked = selectedIds.has(row.id);
          return (
            <tr
              key={row.id}
              className={`hover:bg-gray-50/50 transition-colors ${checked ? 'bg-violet-50/40' : ''}`}
            >
              <td className="pl-[10px] py-2.5 border border-gray-200">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!selectable}
                  onChange={() => onToggleRow(row.id)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-40"
                  aria-label={`Select ${row.materialName}`}
                />
              </td>
              <td className="pr-2 py-2.5 border border-gray-200">
                <span className="text-[12px] font-bold text-gray-900">{row.materialName}</span>
              </td>
              <td className="px-2 py-2.5 border border-gray-200 text-[12px] font-semibold tabular-nums text-gray-900">
                {formatUnits(row.qty)}
              </td>
              <td className="px-2 py-2.5 border border-gray-200 text-[12px] font-semibold tabular-nums text-teal-800">
                {formatUnits(row.liveInventory)}
              </td>
              <td className="px-2 py-2.5 border border-gray-200 text-[12px] tabular-nums">
                {row.draftPoQuantity != null ? (
                  <span className="text-amber-700 font-semibold">{formatUnits(row.draftPoQuantity)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-2 py-2.5 border border-gray-200">{priorityBadge(row.priority)}</td>
              <td className="px-2 py-2.5 border border-gray-200">{workflowBadge(row.workflowStage)}</td>
              <td className="px-2 py-2.5 border border-gray-200 text-[11px] text-gray-600 whitespace-nowrap">
                {new Date(row.lastUpdated).toLocaleString(undefined, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-2 py-2.5 text-right pr-[10px] border border-gray-200 whitespace-nowrap">
                <button
                  type="button"
                  className="inline-flex items-center px-2.5 py-1.5 text-[10px] font-semibold rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 mr-1"
                >
                  View
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  Manage
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}