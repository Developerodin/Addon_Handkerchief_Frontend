'use client';

import React from 'react';
import type { WhmBoxQueueRow } from '../mockBoxesQueue';

const th = 'px-1.5 py-3 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide border border-gray-200';
const thCenter = 'px-1.5 py-3 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide border border-gray-200';
const thRight = 'px-1.5 py-3 text-right text-[11px] font-bold text-gray-600 uppercase tracking-wide border border-gray-200';
const td = 'px-1.5 py-2.5 text-[12px] border border-gray-200';

type Props = {
  rows: WhmBoxQueueRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onTogglePage: (allChecked: boolean) => void;
  allPageChecked: boolean;
};

export default function WhmBoxesQueueTable({ rows, selected, onToggle, onTogglePage, allPageChecked }: Props) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500 py-8 text-center">No orders awaiting scanning.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200 min-w-[900px]">
        <thead>
          <tr className="bg-gray-50/30">
            <th className={`${thCenter} w-8`}>
              <input
                type="checkbox"
                checked={allPageChecked}
                onChange={() => onTogglePage(allPageChecked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                aria-label="Select all orders on this page"
              />
            </th>
            <th className={th}>Order #</th>
            <th className={th}>Mother WH ref</th>
            <th className={th}>Destination</th>
            <th className={th}>Batch</th>
            <th className={th}>Stage</th>
            <th className={th}>Scanner</th>
            <th className={th}>Date</th>
            <th className={thRight}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50/50">
              <td className={`${td} text-center`}>
                <input
                  type="checkbox"
                  checked={selected.has(order.id)}
                  onChange={() => onToggle(order.id)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  aria-label={`Select order ${order.orderNumber}`}
                />
              </td>
              <td className={`${td} font-bold text-gray-900`}>{order.orderNumber}</td>
              <td className={`${td} font-mono text-[10px]`}>{order.motherWhRef}</td>
              <td className={td}>{order.clientName}</td>
              <td className={td}>{order.batch || '—'}</td>
              <td className={td}>{order.stage}</td>
              <td className={td}>{order.scanner || '—'}</td>
              <td className={td}>{new Date(order.date).toLocaleDateString()}</td>
              <td className={`${td} text-right whitespace-nowrap`}>
                <button
                  type="button"
                  className="inline-flex items-center px-2 py-1.5 text-[10px] font-semibold rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 mr-1"
                >
                  View
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 text-[11px] font-semibold rounded bg-violet-600 text-white hover:bg-violet-700"
                >
                  {order.scanningInProgress ? 'Resume' : 'Start'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}