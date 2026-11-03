import React from 'react';
import Link from 'next/link';
import { formatQty } from '../ReportTable';
import { formatDay } from '../po/poFormat';
import { SupplierPoCard } from './supplierTypes';

interface SupplierPoTableProps {
  caption: string;
  rows: SupplierPoCard[];
  emptyLabel: string;
}

/**
 * Purchase orders for one supplier. The number opens the existing order dossier.
 */
export function SupplierPoTable({ caption, rows, emptyLabel }: SupplierPoTableProps) {
  const head = 'px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200';
  const cell = 'px-2 py-2 text-sm text-gray-800 border-b border-gray-100';

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="px-3 py-2 text-left text-sm font-bold text-gray-800">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={head}>Number</th>
            <th scope="col" className={head}>Date</th>
            <th scope="col" className={head}>Status</th>
            <th scope="col" className={`${head} text-right`}>Ordered</th>
            <th scope="col" className={`${head} text-right`}>Received</th>
            <th scope="col" className={`${head} text-right`}>Still due</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={`${cell} text-gray-500`} colSpan={6}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id || row.number}>
                <td className={cell}>
                  <Link
                    href={`/store/reports/po?po=${encodeURIComponent(row.id)}`}
                    className="font-semibold text-gray-800 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]"
                  >
                    {row.number || 'Order'}
                  </Link>
                </td>
                <td className={cell}>{formatDay(row.purchaseDate)}</td>
                <td className={cell}>{row.status || '—'}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatQty(row.ordered)}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatQty(row.received)}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatQty(row.stillDue)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
