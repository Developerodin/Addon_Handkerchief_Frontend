'use client';

import React from 'react';
import { RollRow } from '@/shared/services/factoryApi';

const HEADERS = [
  'Roll ID',
  'Barcode',
  'Fabric',
  'Colour',
  'Net weight (kg)',
  'Gross weight (kg)',
  'Lot number',
  'Rack',
  'Received date',
  'Actions',
];

/**
 * Kilograms with the unit, matching the unallocated roll table.
 */
function formatWeightKg(value?: number | null): string {
  const weight = Number(value);
  if (!Number.isFinite(weight)) return '-';
  return `${weight} kg`;
}

/**
 * Receipt date as dd/mm/yyyy.
 */
function formatReceivedDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
}

/**
 * Allocated rolls for the selected purchase order, with an unallocate action.
 */
export function AllocatedRollTable({
  rolls,
  busyId,
  onUnallocate,
}: {
  rolls: RollRow[];
  busyId: string;
  onUnallocate: (roll: RollRow) => void;
}) {
  if (!rolls.length) {
    return (
      <div className="py-8 text-center">
        <i className="ri-inbox-line text-3xl text-gray-400" aria-hidden />
        <h3 className="mt-3 text-xs font-bold text-gray-900">No allocated rolls</h3>
        <p className="mt-1 text-xs text-gray-500">Rolls from this purchase order that are on a rack show up here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50/30">
            {HEADERS.map((label) => (
              <th
                key={label}
                scope="col"
                className={`border border-gray-200 px-1.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[#495057] ${label === 'Actions' ? 'pr-2.5 text-right' : 'text-left'}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rolls.map((roll) => {
            const busy = busyId === roll.id;
            return (
              <tr key={roll.id} className="transition-colors hover:bg-gray-50/50">
                <td className="border border-gray-200 px-1.5 py-2 text-xs font-medium text-gray-900">{roll.rollCode || '-'}</td>
                <td className="border border-gray-200 px-1.5 py-2 font-mono text-xs text-gray-900">{roll.barcode || '-'}</td>
                <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{roll.fabricName || '-'}</td>
                <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{roll.colourName || '-'}</td>
                <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{formatWeightKg(roll.netWeight)}</td>
                <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{formatWeightKg(roll.grossWeight)}</td>
                <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{roll.receivedLotNumber || '-'}</td>
                <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{roll.rackCode || '-'}</td>
                <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{formatReceivedDate(roll.receivedDate)}</td>
                <td className="border border-gray-200 px-1.5 py-2 pr-2.5 text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    aria-label={`Unallocate ${roll.rollCode || roll.barcode}`}
                    disabled={busy}
                    onClick={() => onUnallocate(roll)}
                  >
                    <i className="ri-arrow-go-back-line text-xs" aria-hidden />
                    {busy ? 'Unallocating…' : 'Unallocate'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
