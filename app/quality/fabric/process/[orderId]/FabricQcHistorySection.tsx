'use client';

import React from 'react';
import { PurchaseOrderRow, RollRow } from '@/shared/services/factoryApi';
import { finishedQcLots, formatQcStatus, lotQcStatus, qcStatusClass } from '../../fabricQcLots';

export interface FabricQcHistorySectionProps {
  order: PurchaseOrderRow;
  rolls: RollRow[];
}

/**
 * Read-only lot QC record for one purchase order.
 */
export function FabricQcHistorySection({ order, rolls }: FabricQcHistorySectionProps) {
  const records = finishedQcLots(order);
  if (!records.length) {
    return (
      <div className="border-t border-gray-100 p-4 text-center">
        <i className="ri-history-line mb-2 text-3xl text-gray-300" aria-hidden />
        <p className="text-[11px] text-gray-500">No QC records for this PO yet.</p>
      </div>
    );
  }

  return (
    <section className="border-t border-gray-100 p-4" aria-label="QC history">
      <h2 className="mb-3 text-xs font-bold text-gray-800">
        QC History ({records.length} lot{records.length === 1 ? '' : 's'})
      </h2>
      <ul className="space-y-3">
        {records.map((lot) => {
          const status = lotQcStatus(lot);
          const count = rolls.filter((roll) => roll.receivedLotNumber === lot.lotNumber).length;
          return (
            <li key={lot.lotNumber} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-gray-900">Lot {lot.lotNumber}</span>
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${qcStatusClass(status)}`}>{formatQcStatus(status)}</span>
                <span className="text-[10px] text-gray-400">{count || lot.rolls} roll(s)</span>
              </div>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-400">QC by</dt>
                  <dd className="text-[11px] font-medium text-gray-800">{lot.qcBy || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-400">QC date</dt>
                  <dd className="text-[11px] font-medium text-gray-800">{lot.qcAt ? new Date(lot.qcAt).toLocaleString('en-IN') : '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Remarks</dt>
                  <dd className="whitespace-pre-wrap text-[11px] text-gray-700">{lot.qcRemarks || '—'}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
