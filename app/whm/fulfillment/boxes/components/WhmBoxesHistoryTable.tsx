'use client';

import React from 'react';
import type { WhmBoxHistoryRow } from '../mockBoxesQueue';

const th = 'px-1.5 py-3 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide border border-gray-200';
const thCenter = 'px-1.5 py-3 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide border border-gray-200';
const thRight = 'px-1.5 py-3 text-right text-[11px] font-bold text-gray-600 uppercase tracking-wide border border-gray-200';
const td = 'px-1.5 py-2.5 text-[12px] border border-gray-200';

type Props = {
  rows: WhmBoxHistoryRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onTogglePage: (allChecked: boolean) => void;
  allPageChecked: boolean;
};

export default function WhmBoxesHistoryTable({ rows, selected, onToggle, onTogglePage, allPageChecked }: Props) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500 py-8 text-center">No completed scan sessions yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200 min-w-[800px]">
        <thead>
          <tr className="bg-gray-50/30">
            <th className={`${thCenter} w-8`}>
              <input
                type="checkbox"
                checked={allPageChecked}
                onChange={() => onTogglePage(allPageChecked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                aria-label="Select all on this page"
              />
            </th>
            <th className={th}>Order #</th>
            <th className={th}>Mother WH ref</th>
            <th className={th}>Completed by</th>
            <th className={th}>Completed at</th>
            <th className={th}>Match summary</th>
            <th className={thRight}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50/50">
              <td className={`${td} text-center`}>
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => onToggle(row.id)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
              </td>
              <td className={`${td} font-bold text-gray-900`}>{row.orderNumber}</td>
              <td className={`${td} font-mono text-[10px]`}>{row.motherWhRef}</td>
              <td className={td}>{row.completedBy}</td>
              <td className={td}>{new Date(row.completedAt).toLocaleString()}</td>
              <td className={td}>{row.matchSummary}</td>
              <td className={`${td} text-right`}>
                <button
                  type="button"
                  className="inline-flex items-center px-2 py-1.5 text-[10px] font-semibold rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                >
                  Journey
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}