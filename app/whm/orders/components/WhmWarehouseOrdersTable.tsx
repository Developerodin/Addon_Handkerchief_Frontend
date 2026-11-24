'use client';

import React, { useMemo } from 'react';
import {
  groupOrdersByDate,
  WHM_FLOW_STAGE_LABEL,
  WHM_ORDER_STATUS_LABEL,
  type WhmOrderStatus,
  type WhmWarehouseOrder,
} from '../mockWarehouseOrders';

const th =
  'px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200';
const thFirst =
  'pl-[10px] pr-1 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200';
const thLast =
  'px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200';
const td = 'px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200';
const tdBold = 'pl-[10px] pr-1 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200';

function statusPill(status: WhmOrderStatus) {
  const cls =
    status === 'cancelled'
      ? 'bg-red-100 text-red-800'
      : status === 'dispatched'
        ? 'bg-teal-100 text-teal-800'
        : status === 'packed'
          ? 'bg-emerald-100 text-emerald-800'
          : status === 'in-progress'
            ? 'bg-violet-100 text-violet-800'
            : status === 'pending'
              ? 'bg-sky-100 text-sky-800'
              : 'bg-amber-100 text-amber-800';
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded tracking-tight ${cls}`}>
      {WHM_ORDER_STATUS_LABEL[status]}
    </span>
  );
}

function flowPill(flowStage: string) {
  const label = WHM_FLOW_STAGE_LABEL[flowStage] || flowStage;
  const s = flowStage;
  const cls =
    s === 'cancelled'
      ? 'bg-red-100 text-red-800'
      : s === 'dispatched'
        ? 'bg-teal-100 text-teal-800'
        : s === 'billed' || s === 'ready-to-dispatch' || s === 'sent-to-billing'
          ? 'bg-emerald-100 text-emerald-800'
          : s.includes('scanning')
            ? 'bg-indigo-100 text-indigo-800'
            : s.includes('packing')
              ? 'bg-violet-100 text-violet-800'
              : s === 'picking'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-sky-100 text-sky-800';
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded tracking-tight ${cls}`}>{label}</span>
  );
}

type Props = {
  rows: WhmWarehouseOrder[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
};

const COLUMN_COUNT = 12;

export default function WhmWarehouseOrdersTable({ rows, selectedIds, onSelectionChange }: Props) {
  const groupedRows = useMemo(() => groupOrdersByDate(rows), [rows]);
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(rows.map((r) => r.id)));
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <i className="ri-inbox-2-line text-xl text-gray-200" />
        </div>
        <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
        <p className="text-[11px] text-gray-500">No orders match your filters.</p>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse border border-gray-200 min-w-[1100px]">
      <thead>
        <tr className="bg-gray-50/30">
          <th className={`${thFirst} w-10`}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              aria-label="Select all orders"
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
          </th>
          <th className={thFirst}>Order #</th>
          <th className={th}>Mother WH ref</th>
          <th className={th}>Destination</th>
          <th className={th}>Replenishment code</th>
          <th className={th}>Order type</th>
          <th className={th}>Qty</th>
          <th className={th}>Single rows</th>
          <th className={th}>Multi rows</th>
          <th className={th}>Status</th>
          <th className={th}>Flow Stage</th>
          <th className={thLast}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {groupedRows.map(({ dateKey, label, orders }) => (
          <React.Fragment key={dateKey}>
            <tr className="bg-gray-100/80">
              <td colSpan={COLUMN_COUNT} className="px-3 py-2 text-[11px] font-bold text-gray-700 border border-gray-200">
                <i className="ri-calendar-line mr-1.5 text-purple-600" aria-hidden />
                <span>{label}</span>
                <span className="ml-2 text-[10px] font-semibold text-gray-500">({orders.length})</span>
              </td>
            </tr>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className={`${tdBold} w-10`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(o.id)}
                    onChange={() => toggleRow(o.id)}
                    aria-label={`Select order ${o.orderNumber}`}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </td>
                <td className={tdBold}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{o.orderNumber}</span>
                    {o.fromMotherWh ? (
                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-sky-100 text-sky-800 uppercase tracking-tight">
                        Mother WH
                      </span>
                    ) : null}
                    {o.fromMotherWh && o.motherWhSynced ? (
                      <i className="ri-checkbox-circle-fill text-emerald-500 text-xs" title="Synced from mother WH" aria-hidden />
                    ) : null}
                  </div>
                </td>
                <td className={td}>{o.motherWhRef?.trim() || '—'}</td>
                <td className={td}>
                  <span className="text-purple-700">{o.clientName?.trim() || '—'}</span>
                </td>
                <td className={td}>{o.billCode || '—'}</td>
                <td className={td}>{o.clientType}</td>
                <td className={td}>{o.qty}</td>
                <td className={td}>{o.singleRows}</td>
                <td className={td}>{o.multiRows}</td>
                <td className={td}>{statusPill(o.status)}</td>
                <td className={td}>{flowPill(o.flowStage)}</td>
                <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                  <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center bg-violet-50 text-violet-500 border border-violet-100 rounded hover:bg-violet-100 transition-colors"
                      title="Flow stage"
                      aria-label="Flow stage"
                    >
                      <i className="ri-route-line text-xs" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center bg-sky-50 text-sky-500 border border-sky-100 rounded hover:bg-sky-100 transition-colors"
                      title="View"
                      aria-label="View"
                    >
                      <i className="ri-eye-line text-xs" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
                      title="Edit"
                      aria-label="Edit"
                    >
                      <i className="ri-pencil-line text-xs" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <i className="ri-delete-bin-line text-xs" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}