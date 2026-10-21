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
  'Received date',
  'Actions',
];

/**
 * Kilograms with the unit, matching the yarn storage box table.
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
 * Unallocated rolls for the selected purchase order.
 */
export function UnallocatedRollTable({
  rolls,
  onAllocate,
}: {
  rolls: RollRow[];
  onAllocate: (roll: RollRow) => void;
}) {
  if (!rolls.length) {
    return (
      <div className="py-8 text-center">
        <i className="ri-inbox-line text-3xl text-gray-400" aria-hidden />
        <h3 className="mt-3 text-xs font-bold text-gray-900">No unallocated rolls</h3>
        <p className="mt-1 text-xs text-gray-500">Pass the lot on Fabric QC first. Rolls already on a rack are not listed.</p>
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
          {rolls.map((roll) => (
            <tr key={roll.id} className="transition-colors hover:bg-gray-50/50">
              <td className="border border-gray-200 px-1.5 py-2 text-xs font-medium text-gray-900">{roll.rollCode || '-'}</td>
              <td className="border border-gray-200 px-1.5 py-2 font-mono text-xs text-gray-900">{roll.barcode || '-'}</td>
              <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{roll.fabricName || '-'}</td>
              <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{roll.colourName || '-'}</td>
              <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{formatWeightKg(roll.netWeight)}</td>
              <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{formatWeightKg(roll.grossWeight)}</td>
              <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{roll.receivedLotNumber || '-'}</td>
              <td className="border border-gray-200 px-1.5 py-2 text-xs text-gray-900">{formatReceivedDate(roll.receivedDate)}</td>
              <td className="border border-gray-200 px-1.5 py-2 pr-2.5 text-right">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-primary/90"
                  aria-label={`Allocate ${roll.rollCode || roll.barcode}`}
                  onClick={() => onAllocate(roll)}
                >
                  <i className="ri-map-pin-line text-xs" aria-hidden />
                  Allocate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
