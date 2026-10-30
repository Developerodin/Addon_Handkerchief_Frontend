'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RackPrintItem } from '@/shared/utils/qzRackPrint';

/**
 * Asks which racks to print. Nothing is sent until a count or a selection is confirmed.
 */
export function RackPrintPickModal({
  racks,
  onClose,
  onConfirm,
}: {
  racks: RackPrintItem[];
  onClose: () => void;
  onConfirm: (chosen: RackPrintItem[]) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState('');
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const chosen = racks.filter((_, index) => selected.has(index));

  /**
   * Selects the first N racks. An empty box clears the selection.
   */
  const applyCount = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setCount(digits);
    const total = Math.min(racks.length, parseInt(digits, 10) || 0);
    setSelected(new Set(Array.from({ length: total }, (_, index) => index)));
  };

  /**
   * Toggles one rack and keeps the count in step with the selection.
   */
  const toggle = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
    setCount(next.size ? String(next.size) : '');
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rack-pick-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl outline-none"
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <header className="border-b border-gray-200 px-6 py-4">
          <h3 id="rack-pick-title" className="text-lg font-semibold text-gray-900">Print Rack Barcode</h3>
          <p className="mt-1 text-xs text-gray-500">Choose how many stickers to print. Each sticker is one rack, 50 mm × 25 mm.</p>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <label className="mb-4 block text-sm font-medium text-gray-700" htmlFor="rack-print-count">
            How many
            <input
              id="rack-print-count"
              type="number"
              min={1}
              max={racks.length}
              inputMode="numeric"
              placeholder={`1–${racks.length}`}
              value={count}
              className="mt-1 w-32 rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              onChange={(event) => applyCount(event.target.value)}
            />
          </label>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Select racks <span className="text-red-500">*</span></span>
            <div className="flex gap-2 text-xs">
              <button type="button" className="text-primary hover:underline" onClick={() => applyCount(String(racks.length))}>Select all</button>
              <span className="text-gray-300">|</span>
              <button type="button" className="text-primary hover:underline" onClick={() => applyCount('')}>Clear all</button>
            </div>
          </div>
          <ul className="max-h-[400px] space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
            {racks.map((rack, index) => (
              <li key={`${rack.rackCode}-${index}`}>
                <label className="flex cursor-pointer items-center rounded p-2 hover:bg-white">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selected.has(index)}
                    aria-label={`Include ${rack.rackCode}`}
                    onChange={() => toggle(index)}
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    <span className="font-medium">{rack.rackCode}</span>
                    <span className="ml-2 text-gray-500">(Section: {rack.shelf || '-'}, Floor: {rack.floor || '-'})</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-600">Selected: {chosen.length} of {racks.length} racks</p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button type="button" className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            disabled={!chosen.length}
            onClick={() => onConfirm(chosen)}
          >
            <i className="ri-printer-line mr-1.5" aria-hidden />
            Print selected ({chosen.length})
          </button>
        </footer>
      </div>
    </div>
  );
}
