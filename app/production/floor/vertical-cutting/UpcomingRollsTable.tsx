import React from 'react';
import { EmptyQueue, QueueTabs } from '../shared/QueueTabs';
import { ActiveCut, UpcomingRoll } from './types';

/**
 * Formats an issue timestamp for the upcoming table.
 * @param value ISO time from the issue movement
 */
const issuedLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const headClass = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#495057]';
const cellClass = 'border border-gray-200 px-1.5 py-2.5 text-[12px] text-gray-900';

/**
 * Issued rolls waiting for vertical cutting, and cuts still off the rack.
 */
export function UpcomingRollsTable({
  rolls,
  active,
  onOpenRoll,
  onOpenActive,
}: {
  rolls: UpcomingRoll[];
  active: ActiveCut[];
  onOpenRoll: (roll: UpcomingRoll) => void;
  onOpenActive: (cut: ActiveCut) => void;
}) {
  return (
    <QueueTabs
      upcomingCount={rolls.length}
      receivedCount={active.length}
      upcoming={(
      <div className="min-h-[300px] overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              {['Roll', 'Order', 'Fabric', 'Metres', 'Pieces per cut', 'Rack', 'Issued'].map((label, index) => (
                <th key={label} className={`${headClass} ${index === 0 ? 'pl-[10px]' : ''}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rolls.length ? (
              rolls.map((roll) => (
                <tr key={roll.rollBarcode} className="transition-colors hover:bg-gray-50/50">
                  <td className={`${cellClass} pl-[10px]`}>
                    <button type="button" className="font-medium text-purple-600 hover:text-purple-700" onClick={() => onOpenRoll(roll)}>
                      {roll.rollBarcode}
                    </button>
                  </td>
                  <td className={cellClass}>{roll.orderNumber || roll.orderId.slice(-6)}</td>
                  <td className={`${cellClass} text-gray-600`}>{roll.fabricName || '—'}</td>
                  <td className={cellClass}>{roll.qtyMeters || '—'}</td>
                  <td className={cellClass}>{roll.piecesPerCut}</td>
                  <td className={cellClass}>—</td>
                  <td className={`${cellClass} pr-[10px] text-gray-600`}>{issuedLabel(roll.issuedAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="border border-gray-200 py-20 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                    <i className="ri-scissors-cut-line text-xl text-gray-200" aria-hidden />
                  </div>
                  <p className="text-xs font-bold text-gray-400">DATA EMPTY</p>
                  <p className="mt-1 text-[11px] text-gray-400">No issued roll is waiting for vertical cutting.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      received={active.length ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                {['Roll', 'Order', 'Fabric', 'Pieces', 'Still to rack'].map((label) => (
                  <th key={label} className={headClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((cut) => (
                <tr key={cut.rollBarcode} className="transition-colors hover:bg-gray-50/50">
                  <td className={`${cellClass} pl-[10px]`}>
                    <button type="button" className="font-medium text-purple-600 hover:text-purple-700" onClick={() => onOpenActive(cut)}>
                      {cut.rollBarcode}
                    </button>
                  </td>
                  <td className={cellClass}>{cut.orderNumber || cut.orderId.slice(-6)}</td>
                  <td className={`${cellClass} text-gray-600`}>{cut.fabricName || '—'}</td>
                  <td className={cellClass}>{cut.pieces.length}</td>
                  <td className={`${cellClass} pr-[10px]`}>{cut.pieces.filter((piece) => piece.status === 'cut').length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyQueue text="Nothing has been received on this floor yet." />
      )}
    />
  );
}
