import React from 'react';
import { PoDossier } from './poAnalyticsTypes';
import { formatQty, formatStamp } from './poFormat';
import { EmptyNote, Section, bodyCell, headCell } from './poUi';

/**
 * Receipts, quality check, racks, and vendor returns for one order.
 */
export function PoDossierStore({ dossier }: { dossier: PoDossier }) {
  return (
    <>
      <Section title="Receipts">
        {dossier.receipts.length === 0 ? <EmptyNote label="Nothing received yet." /> : (
          <ul className="grid gap-2 px-3 pb-3">
            {dossier.receipts.map((row) => (
              <li key={row.id} className="text-sm text-[#1C1917]">
                <span className="font-semibold">{row.number}</span>
                <span className="text-[#57534E]"> · {formatStamp(row.receivedDate)}</span>
                <span className="block text-[13px] text-[#57534E]">
                  {row.receiver ? `Received by ${row.receiver}` : 'Receiver not recorded'}
                  {row.condition ? ` · ${row.condition}` : ''} · Net {formatQty(row.netWeight)} · Gross {formatQty(row.grossWeight)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Quality check">
        {dossier.qc.length === 0 ? <EmptyNote label="No received lot." /> : (
          <ul className="grid gap-2 px-3 pb-3">
            {dossier.qc.map((row) => (
              <li key={row.lotNumber} className="text-sm text-[#1C1917]">
                <span className="font-semibold">{row.lotNumber}</span>
                <span> · {row.qcStatus}</span>
                <span className="block text-[13px] text-[#57534E]">
                  {row.qcBy ? `By ${row.qcBy}` : 'Checker not recorded'}
                  {row.qcAt ? ` · ${formatStamp(row.qcAt)}` : ''} · {row.rolls} rolls
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Where stored">
        <p className="px-3 pb-2 text-sm text-[#57534E]">
          {dossier.storage.unstored === 0
            ? 'Every roll is on a rack.'
            : `${dossier.storage.unstored} ${dossier.storage.unstored === 1 ? 'roll is' : 'rolls are'} not on a rack.`}
        </p>
        {dossier.storage.racks.length === 0 ? <EmptyNote label="No rolls on this order." /> : (
          dossier.storage.racks.map((group) => (
            <div key={group.rack} className="px-3 pb-3">
              <h4 className="text-sm font-semibold text-[#1C1917]">
                {group.rack} · {group.count}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Barcode', 'Fabric', 'Status', 'Weight'].map((label) => (
                        <th key={label} scope="col" className={headCell}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rolls.map((roll) => (
                      <tr key={roll.barcode}>
                        <td className={bodyCell}>{roll.barcode}</td>
                        <td className={bodyCell}>{roll.fabricName || '—'}</td>
                        <td className={bodyCell}>{roll.status}</td>
                        <td className={`${bodyCell} tabular-nums`}>{formatQty(roll.scaleWeight)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </Section>
      <Section title="Returns">
        {dossier.returns.length === 0 ? <EmptyNote label="No return to the vendor." /> : (
          <ul className="grid gap-2 px-3 pb-3">
            {dossier.returns.map((row) => (
              <li key={row.id} className="text-sm text-[#9F1239]">
                <span className="font-semibold text-[#1C1917]">{row.reason}</span>
                <span> · {formatQty(row.quantity)}</span>
                <span className="block text-[13px] text-[#57534E]">
                  Challan {row.challanNumber || '—'} · {formatStamp(row.issuedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
