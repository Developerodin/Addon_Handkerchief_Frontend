import React from 'react';
import { PoDossier } from './poAnalyticsTypes';
import { formatDay, formatInr, formatQty, formatWhen } from './poFormat';
import { EmptyNote, Section, bodyCell, headCell } from './poUi';

/**
 * What was ordered, whether cutoff was approved, and the packing list.
 */
export function PoDossierGoods({ dossier }: { dossier: PoDossier }) {
  return (
    <>
      <Section title="Ordered and received">
        {dossier.lines.length === 0 ? <EmptyNote label="No lines on this order." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  {['Fabric', 'Sort', 'Ordered', 'Received', 'Still due', 'Value', 'Cutoff'].map((label) => (
                    <th key={label} scope="col" className={headCell}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dossier.lines.map((line) => (
                  <tr key={line.lineId}>
                    <td className={bodyCell}>
                      {line.fabricName || '—'}
                      {line.colourName ? <span className="block text-[13px] text-[#57534E]">{line.colourName}</span> : null}
                    </td>
                    <td className={bodyCell}>{line.fabricSortNo || '—'}</td>
                    <td className={`${bodyCell} tabular-nums`}>{formatQty(line.ordered)} {line.unitName}</td>
                    <td className={`${bodyCell} tabular-nums text-[#166534]`}>{formatQty(line.received)}</td>
                    <td className={`${bodyCell} tabular-nums ${line.stillDue > 0 ? 'text-[#9A3412]' : ''}`}>{formatQty(line.stillDue)}</td>
                    <td className={`${bodyCell} tabular-nums`}>{formatInr(line.value)}</td>
                    <td className={bodyCell}>{line.cutoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      <Section title="Cutoff approval">
        {dossier.lots.length === 0 ? <EmptyNote label="No lot yet." /> : (
          <ul className="grid gap-2 px-3 pb-3">
            {dossier.lots.map((lot) => (
              <li key={lot.id} className="text-sm text-[#1C1917]">
                <span className="font-semibold">{lot.status === 'approved' ? 'Approved' : lot.status === 'rejected' ? 'Rejected' : 'Waiting'}</span>
                {lot.approver ? <span className="text-[#57534E]"> · {lot.approver}</span> : null}
                {lot.approvedAt ? <span className="text-[#57534E]"> · {formatWhen(lot.approvedAt)}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Packing list">
        {dossier.packing.length === 0 ? <EmptyNote label="No packing list." /> : (
          <ul className="grid gap-3 px-3 pb-3">
            {dossier.packing.map((list) => (
              <li key={list.id} className="text-sm text-[#1C1917]">
                <p className="font-semibold">{list.code}</p>
                <p className="text-[13px] text-[#57534E]">
                  Shipped {formatDay(list.shipmentDate)} · Expected {formatDay(list.expectedDelivery)}
                </p>
                <p className="text-[13px] text-[#57534E]">
                  {list.cartons > 0 ? `${list.cartons} cartons · ` : ''}
                  {list.rolls > 0 ? `${formatQty(list.rolls)} rolls · ` : ''}
                  {list.boxes > 0 ? `${formatQty(list.boxes)} boxes · ` : ''}
                  Net {formatQty(list.netWeight)} · Gross {formatQty(list.grossWeight)}
                </p>
                <p className="text-[13px] text-[#57534E]">
                  Invoice {list.invoiceNumber || '—'} {list.invoiceDate ? formatDay(list.invoiceDate) : ''} · LR {list.lrNo || '—'} · Challan {list.challanNumber || '—'}
                </p>
                <p className="text-[13px] text-[#57534E]">
                  {list.courierName || 'No courier'} {list.courierNumber} {list.vehicleNumber ? `· ${list.vehicleNumber}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
