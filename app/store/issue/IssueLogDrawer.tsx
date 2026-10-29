'use client';

import React from 'react';
import { FactoryDrawer } from '@/shared/components/factory/FactoryDrawer';
import { FabricIssueRow } from '@/shared/services/factoryApi';
import { articleLabel, formatIssueTime, formatKg, formatMetres } from './fabricIssueMath';

/**
 * Rolls already issued. Scoped to the selected order when one is open.
 */
export function IssueLogDrawer({
  open,
  orderNumber,
  rows,
  onClose,
}: {
  open: boolean;
  orderNumber: string;
  rows: FabricIssueRow[];
  onClose: () => void;
}) {
  return (
    <FactoryDrawer title="Issue log" subtitle={orderNumber || 'All orders'} open={open} wide onClose={onClose}>
      {rows.length === 0 ? (
        <p className="text-sm text-[#4B5563]">No rolls have been issued yet. Select an article and scan a roll.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-[#F5F5F7] text-[11px] font-bold uppercase text-[#4B5563]">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">User</th>
                {!orderNumber ? <th className="px-3 py-2">Order</th> : null}
                <th className="px-3 py-2">Article</th>
                <th className="px-3 py-2">Fabric</th>
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2">Gross kg</th>
                <th className="px-3 py-2">Net kg</th>
                <th className="px-3 py-2">Meters</th>
                <th className="px-3 py-2">Rack</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-[#111827]">{formatIssueTime(row.createdAt)}</td>
                  <td className="px-3 py-2 text-[#111827]">{row.userName || '—'}</td>
                  {!orderNumber ? <td className="px-3 py-2 text-[#111827]">{row.orderNumber || '—'}</td> : null}
                  <td className="px-3 py-2 text-[#111827]">{articleLabel(row.factoryCode, row.articleName)}</td>
                  <td className="px-3 py-2 text-[#111827]">{row.fabricName || '—'}</td>
                  <td className="px-3 py-2 font-bold text-[#111827]">{row.barcode}</td>
                  <td className="px-3 py-2 text-[#111827]">{row.grossWeight == null ? '—' : formatKg(row.grossWeight)}</td>
                  <td className="px-3 py-2 text-[#111827]">{formatKg(row.netWeight)}</td>
                  <td className="px-3 py-2 text-[#111827]">{row.qtyMeters == null ? '—' : formatMetres(row.qtyMeters)}</td>
                  <td className="px-3 py-2 text-[#111827]">{row.fromLocation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FactoryDrawer>
  );
}
