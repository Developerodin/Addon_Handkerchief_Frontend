'use client';

import React from 'react';
import type { WhmInwardRow } from '../mockInwardReceived';

function statusBadge(status: WhmInwardRow['status']) {
  if (status === 'ACCEPTED') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (status === 'ON_HOLD') return 'bg-amber-100 text-amber-900 border border-amber-200';
  return 'bg-red-100 text-red-800 border border-red-200';
}

type Props = { rows: WhmInwardRow[] };

export default function WhmInwardReceivedTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[280px] text-center px-4">
        <i className="ri-inbox-line text-4xl text-gray-300 mb-4" aria-hidden />
        <h3 className="text-sm font-bold text-gray-400 mb-1">No matches</h3>
        <p className="text-xs text-gray-400">No rows match your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead className="bg-gray-100 border-b border-gray-300">
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Source</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Product</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Sort No</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Prod qty (pcs)</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Style code</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Design</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Received at</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Received (pcs)</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Status</th>
            <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-2 py-1.5 border-r border-gray-300 text-[10px] font-bold uppercase text-gray-600 whitespace-nowrap">
                {r.source === 'FACTORY' ? 'Factory FG' : 'QC hold'}
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 font-semibold text-gray-900 whitespace-nowrap">{r.productCode}</td>
              <td className="px-2 py-1.5 border-r border-gray-300 font-mono text-[10px] font-medium text-gray-800 whitespace-nowrap">{r.sortNo}</td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-right font-medium tabular-nums text-teal-800">
                {r.productionQty.toLocaleString()}
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap font-medium text-gray-900" title={r.styleCode}>
                {r.styleCode}
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap text-gray-800">{r.design}</td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-gray-600 whitespace-nowrap text-[10px]">
                {new Date(r.receivedAt).toLocaleString()}
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-right tabular-nums font-semibold text-gray-900">
                {r.receivedQty.toLocaleString()}
              </td>
              <td className="px-2 py-1.5 border-r border-gray-300 text-center">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadge(r.status)}`}
                >
                  {r.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-2 py-1.5 text-center">
                <div className="inline-flex items-center justify-center gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 w-7 h-7"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <i className="ri-pencil-line text-sm" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 w-7 h-7"
                    title="Accept"
                    aria-label="Accept"
                  >
                    <i className="ri-check-line text-sm" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}