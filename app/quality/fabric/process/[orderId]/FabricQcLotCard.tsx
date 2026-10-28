'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PurchaseOrderLine, ReceivedLot, RollRow } from '@/shared/services/factoryApi';
import { fabricIdentityLabel } from '@/app/store/po-received/goodsReceivedModel';
import { formatQcStatus, LotQcAction, lotQcStatus, qcStatusClass } from '../../fabricQcLots';

const head = 'border border-gray-200 bg-gray-50 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500';

export interface FabricQcLotCardProps {
  index: number;
  orderId: string;
  lot: ReceivedLot;
  lines: PurchaseOrderLine[];
  rolls: RollRow[];
  deciding: boolean;
  onDecide: (lotNumber: string, action: LotQcAction, remarks: string) => void;
}

/**
 * Received lot summary. Pass approves every roll that was not rejected. Reject and hold cover the lot.
 */
export function FabricQcLotCard({ index, orderId, lot, lines, rolls, deciding, onDecide }: FabricQcLotCardProps) {
  const [remarks, setRemarks] = useState(lot.qcRemarks || '');
  const status = lotQcStatus(lot);
  const rejected = rolls.filter((roll) => roll.qcStatus === 'rejected').length;

  return (
    <article className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700">{index + 1}</span>
        <h3 className="text-xs font-bold text-gray-900">Lot: {lot.lotNumber}</h3>
        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${qcStatusClass(status)}`}>{formatQcStatus(status)}</span>
        <span className="text-[10px] text-gray-400">{rolls.length || lot.rolls} roll{(rolls.length || lot.rolls) === 1 ? '' : 's'}</span>
        {rejected ? <span className="text-[10px] font-semibold text-red-700">{rejected} rejected</span> : null}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Rolls" value={String(lot.rolls)} />
        <Stat label="Gross weight" value={String(lot.grossWeight)} />
        <Stat label="Net weight" value={String(lot.netWeight)} />
        <Stat label="PO lines" value={String((lot.lines || []).length)} />
      </div>
      {(lot.lines || []).length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                {['Fabric', 'Sort No', 'Received qty'].map((label) => (
                  <th key={label} className={head}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lot.lines.map((row) => {
                const line = lines.find((item) => item.lineId === row.lineId);
                return (
                  <tr key={row.lineId}>
                    <td className="border border-gray-200 px-2 py-1.5">{line ? fabricIdentityLabel(line) : row.lineId}</td>
                    <td className="border border-gray-200 px-2 py-1.5">{line?.fabricSortNo || '—'}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right font-bold">{row.receivedQuantity} {line?.unitName || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {rejected || status === 'rejected' ? (
        <Link href={`/store/vendor-returns?poId=${orderId}&lot=${encodeURIComponent(lot.lotNumber)}`} className="mt-3 inline-flex text-[11px] font-bold text-primary underline">
          Open PO return for this lot
        </Link>
      ) : null}
      <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-gray-500" htmlFor={`remarks-${lot.lotNumber}`}>
        Remarks
      </label>
      <textarea
        id={`remarks-${lot.lotNumber}`}
        className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
        rows={2}
        value={remarks}
        aria-label={`Remarks for lot ${lot.lotNumber}`}
        onChange={(event) => setRemarks(event.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="rounded bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={deciding} aria-label={`Pass lot ${lot.lotNumber}`} onClick={() => onDecide(lot.lotNumber, 'pass', remarks)}>
          Pass lot
        </button>
        <button type="button" className="rounded bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={deciding} aria-label={`Reject lot ${lot.lotNumber}`} onClick={() => onDecide(lot.lotNumber, 'reject', remarks)}>
          Reject lot
        </button>
        <button type="button" className="rounded bg-orange-500 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={deciding} aria-label={`Hold lot ${lot.lotNumber}`} onClick={() => onDecide(lot.lotNumber, 'hold', remarks)}>
          Hold lot
        </button>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] uppercase text-gray-500">{label}</p>
      <p className="text-xs font-bold text-gray-900">{value}</p>
    </div>
  );
}
