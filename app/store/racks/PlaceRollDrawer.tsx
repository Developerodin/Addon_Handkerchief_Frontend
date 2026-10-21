'use client';

import React, { useState } from 'react';
import { factoryRequest, RollRow } from '@/shared/services/factoryApi';

export interface PlaceRollDrawerProps {
  roll: RollRow;
  onClose: () => void;
  onPlaced: (rackCode: string, alreadyThere?: boolean) => void;
}

/**
 * Asks for the rack barcode and stores the scanned roll there.
 */
export function PlaceRollDrawer({ roll, onClose, onPlaced }: PlaceRollDrawerProps) {
  const [rackCode, setRackCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const blocked = roll.qcStatus !== 'passed';

  /**
   * Resolves the rack barcode and writes the stock movement.
   */
  const place = async (event: React.FormEvent) => {
    event.preventDefault();
    if (blocked) return;
    if (!rackCode.trim()) {
      setError('Scan the rack barcode');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await factoryRequest<{ rackCode: string; alreadyThere?: boolean }>('/store/racks', {
        method: 'POST',
        body: JSON.stringify({ rollBarcode: roll.barcode, rackCode: rackCode.trim() }),
      });
      onPlaced(data.rackCode, Boolean(data.alreadyThere));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place this roll');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close place roll" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="place-roll-title" className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="place-roll-title" className="text-base font-bold text-gray-900">Place roll</h2>
          <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-50" aria-label="Close" onClick={onClose}>
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </header>
        <form className="flex flex-1 flex-col" onSubmit={place}>
          <div className="flex-1 space-y-4 px-5 py-4">
            <div className="rounded-md border border-gray-200 px-3 py-2">
              <p className="text-sm font-bold text-gray-900">{roll.rollCode || roll.barcode}</p>
              <p className="font-mono text-[11px] text-gray-500">{roll.barcode}</p>
              <p className="mt-1 text-xs text-gray-600">{roll.fabricName || 'Fabric'} · {roll.colourName || '—'} · lot {roll.receivedLotNumber || '—'}</p>
            </div>
            {blocked ? <p className="text-sm text-red-600" role="alert">Only a QC-passed roll can be stored.</p> : null}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Rack barcode</span>
              <input
                autoFocus
                value={rackCode}
                aria-label="Rack barcode"
                placeholder="Scan the rack barcode"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                onChange={(event) => setRackCode(event.target.value)}
              />
              <p className="mt-1 text-[11px] text-gray-500">The roll is stored on the rack that owns this barcode.</p>
            </label>
            {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          </div>
          <footer className="border-t border-gray-100 p-4">
            <button type="submit" className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-50" disabled={saving || blocked}>
              {saving ? 'Placing…' : 'Place on rack'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
