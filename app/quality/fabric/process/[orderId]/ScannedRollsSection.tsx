'use client';

import React from 'react';
import { RollRow } from '@/shared/services/factoryApi';
import { formatQcStatus, qcStatusClass } from '../../fabricQcLots';

export interface ScannedRollsSectionProps {
  rolls: RollRow[];
  busyBarcode: string;
  onReject: (roll: RollRow) => void;
  onRemove: (roll: RollRow) => void;
}

/**
 * Rolls scanned in this QC session. Reject persists. Remove only drops it from the list.
 */
export function ScannedRollsSection({ rolls, busyBarcode, onReject, onRemove }: ScannedRollsSectionProps) {
  return (
    <section className="rounded border border-gray-200" aria-label="Scanned rolls">
      <header className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-xs font-bold text-gray-800">Scanned rolls ({rolls.length})</h2>
      </header>
      {rolls.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500">Scan a roll barcode. It stays in this list until you pass, reject, or hold the lot.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                {['Roll', 'Barcode', 'Lot', 'Fabric', 'QC', 'Actions'].map((label) => (
                  <th key={label} className="border border-gray-200 px-2 py-2 text-left">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rolls.map((roll) => {
                const status = roll.qcStatus || 'pending';
                return (
                  <tr key={roll.id}>
                    <td className="border border-gray-200 px-2 py-2 font-semibold">{roll.rollCode || '—'}</td>
                    <td className="border border-gray-200 px-2 py-2 font-mono">{roll.barcode}</td>
                    <td className="border border-gray-200 px-2 py-2">{roll.receivedLotNumber || '—'}</td>
                    <td className="border border-gray-200 px-2 py-2">{roll.fabricName || '—'} {roll.colourName ? `· ${roll.colourName}` : ''}</td>
                    <td className="border border-gray-200 px-2 py-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${qcStatusClass(status)}`}>{formatQcStatus(status)}</span>
                    </td>
                    <td className="border border-gray-200 px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
                          disabled={busyBarcode === roll.barcode || status === 'rejected'}
                          aria-label={`Reject roll ${roll.rollCode || roll.barcode}`}
                          onClick={() => onReject(roll)}
                        >
                          Reject roll
                        </button>
                        <button
                          type="button"
                          className="rounded border border-gray-300 px-2 py-1 text-[10px] font-bold text-gray-600"
                          aria-label={`Remove ${roll.rollCode || roll.barcode} from the scan list`}
                          onClick={() => onRemove(roll)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
