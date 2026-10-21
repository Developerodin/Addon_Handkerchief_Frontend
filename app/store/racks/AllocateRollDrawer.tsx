'use client';

import React, { useEffect, useState } from 'react';
import { factoryRequest, RollRow } from '@/shared/services/factoryApi';

interface RackOption {
  code: string;
  name: string;
  count: number;
}

export interface AllocateRollDrawerProps {
  roll: RollRow;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Puts one QC-passed roll onto an existing storage rack.
 */
export function AllocateRollDrawer({ roll, onClose, onSaved }: AllocateRollDrawerProps) {
  const [racks, setRacks] = useState<RackOption[]>([]);
  const [rackCode, setRackCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    factoryRequest<{ results: RackOption[] }>('/store/rack-board')
      .then((data) => setRacks(data.results || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load racks'));
  }, []);

  /**
   * Stores the roll and closes the drawer.
   */
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await factoryRequest('/store/racks', {
        method: 'POST',
        body: JSON.stringify({ rollBarcode: roll.barcode, rackCode }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not allocate this roll');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl" aria-label="Allocate roll">
        <header className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800">Allocate {roll.rollCode || roll.barcode}</h2>
          <button type="button" className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Close allocate drawer" onClick={onClose}>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>
        <form className="space-y-3 p-4" onSubmit={save}>
          <p className="text-xs text-gray-600">{roll.fabricName || 'Fabric'} · lot {roll.receivedLotNumber || '—'}</p>
          <label className="block text-[10px] font-bold uppercase text-gray-500" htmlFor="allocate-rack">Rack</label>
          <select id="allocate-rack" aria-label="Rack" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" required value={rackCode} onChange={(event) => setRackCode(event.target.value)}>
            <option value="">Select rack</option>
            {racks.map((rack) => (
              <option key={rack.code} value={rack.code}>{rack.code} · {rack.name} · {rack.count}</option>
            ))}
          </select>
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <button type="submit" className="rounded bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={saving}>
            {saving ? 'Allocating…' : 'Allocate'}
          </button>
        </form>
      </aside>
    </>
  );
}
