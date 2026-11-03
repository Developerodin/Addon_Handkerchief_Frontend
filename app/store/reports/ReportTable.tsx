'use client';

import React from 'react';

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

interface ReportTableProps {
  caption: string;
  columns: ReportColumn[];
  rows: Record<string, string>[];
  emptyLabel: string;
}

/**
 * Dense report table shared by the fabric analytics screens.
 */
export function ReportTable({ caption, columns, rows, emptyLabel }: ReportTableProps) {
  const head = 'px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200';
  const cell = 'px-2 py-2 text-sm text-gray-800 border-b border-gray-100';

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="w-full min-w-[640px] border-collapse">
        <caption className="px-3 py-2 text-left text-sm font-bold text-gray-800">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`${head} ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={`${cell} text-gray-500`} colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${row[columns[0]?.key] || 'row'}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key} className={`${cell} ${column.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Indian grouped number with up to three decimals.
 * @param value - Quantity from a report total
 */
export function formatQty(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(value || 0);
}
