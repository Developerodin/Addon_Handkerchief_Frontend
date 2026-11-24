'use client';

import React from 'react';
import type { WhmWarehouseStockRow, WhmStockState } from '../mockWarehouseStock';

function stockStateBadge(state: WhmStockState) {
  const map: Record<WhmStockState, string> = {
    Checked: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    Unchecked: 'bg-amber-100 text-amber-900 border border-amber-200',
    'In QC': 'bg-sky-100 text-sky-800 border border-sky-200',
    Rejected: 'bg-red-100 text-red-800 border border-red-200',
  };
  return map[state] || 'bg-gray-100 text-gray-700';
}

type Props = { rows: WhmWarehouseStockRow[] };

export default function WhmWarehouseInventoryTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[280px] text-center px-4">
        <i className="ri-stack-line text-4xl text-gray-300 mb-4" aria-hidden />
        <h3 className="text-sm font-bold text-gray-400 mb-1">No inventory rows</h3>
        <p className="text-xs text-gray-400">Adjust filters or add a row.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead className="bg-gray-100 border-b border-gray-300">
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Product</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Sort No</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Style code</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Design</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Pack type</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Stock state</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Total (pcs)</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Blocked</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Avail</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Updated</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-2 py-1.5 border-r border-gray-300 font-semibold text-gray-900 max-w-[120px] truncate" title={r.product}>
                {r.product}
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-gray-700 whitespace-nowrap font-mono text-[10px]">{r.sortNo}</td>
              <td className="px-2 py-1.5 border-r border-gray-300 font-medium text-gray-900 max-w-[110px] truncate" title={r.style}>
                {r.style}
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 max-w-[140px] truncate text-gray-800" title={r.design}>
                {r.design}
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-gray-600 whitespace-nowrap">{r.packType}</td>
              <td className="px-2 py-1.5 border-r border-gray-300">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${stockStateBadge(r.stockState)}`}>
                  {r.stockState}
                </span>
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-right font-medium tabular-nums text-gray-900">{r.total.toLocaleString()}</td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-right font-medium tabular-nums text-orange-700">{r.blocked.toLocaleString()}</td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-right font-bold tabular-nums text-teal-800">{r.available.toLocaleString()}</td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-[10px] text-gray-500 whitespace-nowrap">
                {new Date(r.updatedAt).toLocaleString()}
              </td>
              <td className="px-2 py-1.5 text-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 w-7 h-7"
                  title="View"
                  aria-label="View"
                >
                  <i className="ri-eye-line text-sm" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}