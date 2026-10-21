'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { factoryRequest } from '@/shared/services/factoryApi';
import { historyQcRange } from '@/app/quality/fabric/fabricQcLots';

interface SummaryRow {
  month: string;
  supplier: string;
  receipts: number;
  netWeight: number;
  grossWeight: number;
}

/**
 * Monthly receipt totals, with an Excel download of the current range.
 */
export function GrnSummary() {
  const initial = historyQcRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    factoryRequest<{ results: SummaryRow[] }>(`/store/receipt-summary?from=${from}&to=${to}`)
      .then((data) => {
        if (!cancelled) setRows(data.results || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the summary');
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  /**
   * Writes the visible summary rows to an xlsx file.
   */
  const download = () => {
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'GRN summary');
    XLSX.writeFile(book, `grn-summary-${from}-${to}.xlsx`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" aria-label="Summary from" className="rounded border border-gray-300 px-2 py-1.5 text-xs" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input type="date" aria-label="Summary to" className="rounded border border-gray-300 px-2 py-1.5 text-xs" value={to} onChange={(event) => setTo(event.target.value)} />
        <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-[11px] font-bold" onClick={download} disabled={!rows.length}>
          Excel
        </button>
      </div>
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50 text-[10px] uppercase text-gray-500">
            {['Month', 'Supplier', 'Receipts', 'Gross', 'Net'].map((label) => (
              <th key={label} className="border border-gray-200 px-2 py-2 text-left">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.month}-${row.supplier}`}>
              <td className="border border-gray-200 px-2 py-2">{row.month}</td>
              <td className="border border-gray-200 px-2 py-2">{row.supplier}</td>
              <td className="border border-gray-200 px-2 py-2">{row.receipts}</td>
              <td className="border border-gray-200 px-2 py-2">{row.grossWeight}</td>
              <td className="border border-gray-200 px-2 py-2">{row.netWeight}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p className="text-sm text-gray-500">No receipts in this range.</p> : null}
    </div>
  );
}
