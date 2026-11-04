'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listStorageRacks, StorageRack } from '@/shared/services/phase3CatalogService';

const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';
const headClass = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase text-[#495057]';
const cellClass = 'border border-gray-200 px-1.5 py-2 text-[12px]';

interface BoxRow {
  id: string;
  barcode: string;
  status: string;
  pieceQty: number;
  scaleWeight: number;
  rackCode?: string;
}

/**
 * Weighs an open box, then stores a weighed box on a box rack.
 */
export default function BoxesPage() {
  const [openBoxes, setOpenBoxes] = useState<BoxRow[]>([]);
  const [weighed, setWeighed] = useState<BoxRow[]>([]);
  const [error, setError] = useState('');
  const [job, setJob] = useState<BoxRow | null>(null);
  const [mode, setMode] = useState<'weigh' | 'store'>('weigh');

  const load = useCallback(async () => {
    const data = await factoryRequest<{ results: BoxRow[]; active: BoxRow[] }>('/warehouse/boxes/upcoming');
    setOpenBoxes(data.results || []);
    setWeighed(data.active || []);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load boxes'));
  }, [load]);

  /**
   * Opens the weigh or rack drawer for one box.
   * @param {BoxRow} row
   * @param {'weigh' | 'store'} next
   */
  const openBox = (row: BoxRow, next: 'weigh' | 'store') => {
    setMode(next);
    setJob(row);
    setError('');
  };

  return (
    <RequireCrudPermission path="Warehouse / Boxes" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Boxes" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Boxes</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{openBoxes.length}</span>
          </div>
          {error ? <p className="mb-3 text-[12px] text-red-600" role="alert">{error}</p> : null}
          <h2 className="mb-2 text-[12px] font-bold text-gray-800">Waiting for a weight</h2>
          <BoxTable rows={openBoxes} empty="No box is waiting to be weighed." onOpen={(row) => openBox(row, 'weigh')} />
          <h2 className="mb-2 mt-6 text-[12px] font-bold text-gray-800">Waiting for a rack</h2>
          <BoxTable rows={weighed} empty="No weighed box is waiting for a rack." onOpen={(row) => openBox(row, 'store')} />
        </div>
        <BoxDrawer box={job} mode={mode} onClose={() => setJob(null)} onChanged={load} />
      </div>
    </RequireCrudPermission>
  );
}

/**
 * One list of boxes.
 */
function BoxTable({ rows, empty, onOpen }: { rows: BoxRow[]; empty: string; onOpen: (row: BoxRow) => void }) {
  return (
    <table className="w-full border-collapse border border-gray-200">
      <thead>
        <tr className="bg-gray-50/30">{['Box', 'Pieces', 'Weight', 'Rack'].map((label) => <th key={label} className={headClass}>{label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((row) => (
          <tr key={row.id}>
            <td className={cellClass}><button type="button" className="font-mono font-medium text-purple-600" onClick={() => onOpen(row)}>{row.barcode}</button></td>
            <td className={cellClass}>{row.pieceQty}</td>
            <td className={cellClass}>{row.scaleWeight || ''}</td>
            <td className={cellClass}>{row.rackCode || ''}</td>
          </tr>
        )) : <tr><td colSpan={4} className="border border-gray-200 py-10 text-center text-[11px] text-gray-400">{empty}</td></tr>}
      </tbody>
    </table>
  );
}

/**
 * Scale weight, or a box rack. A sticker is not printed here.
 */
function BoxDrawer({ box, mode, onClose, onChanged }: { box: BoxRow | null; mode: 'weigh' | 'store'; onClose: () => void; onChanged: () => Promise<void> }) {
  const [weight, setWeight] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!box || mode !== 'store') return;
    listStorageRacks({ limit: 200, page: 1 })
      .then((page) => setRacks((page.results || []).filter((rack) => rack.stockType === 'box')))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load racks'));
  }, [box, mode]);

  return (
    <FactoryDrawer title={mode === 'weigh' ? 'Box weighing' : 'Box storage'} subtitle={box?.barcode} open={Boolean(box)} onClose={onClose}>
      <DrawerSection title={mode === 'weigh' ? 'Scale' : 'Rack'}>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!box) return;
            setSaving(true);
            setError('');
            try {
              const path = mode === 'weigh' ? '/warehouse/boxes/weigh' : '/warehouse/boxes/store';
              const payload = mode === 'weigh' ? { boxBarcode: box.barcode, scaleWeight: Number(weight) } : { boxBarcode: box.barcode, rackCode };
              await factoryRequest(path, { method: 'POST', body: JSON.stringify(payload) });
              onClose();
              await onChanged();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Box failed');
            } finally {
              setSaving(false);
            }
          }}
        >
          {mode === 'weigh' ? (
            <>
              <label className="text-[11px] font-bold text-[#495057]" htmlFor="bxWeight">Scale weight</label>
              <input id="bxWeight" aria-label="Scale weight" className={fieldClass} inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} required />
            </>
          ) : (
            <>
              <label className="text-[11px] font-bold text-[#495057]" htmlFor="bxRack">Box rack</label>
              <input id="bxRack" aria-label="Box rack" className={fieldClass} value={rackCode} onChange={(event) => setRackCode(event.target.value)} required />
              <select aria-label="Box rack list" className={fieldClass} value={rackCode} onChange={(event) => setRackCode(event.target.value)}>
                <option value="">Select rack</option>
                {racks.map((rack) => <option key={rack.id} value={rack.code}>{rack.name} · {rack.code}</option>)}
              </select>
              {!racks.length ? <p className="text-[12px] text-gray-500">No box racks are in the catalog. <Link href="/catalog/storage-racks" className="text-purple-600">Storage racks</Link></p> : null}
            </>
          )}
          {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
          <button type="submit" className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving}>{mode === 'weigh' ? 'Save weight' : 'Put away'}</button>
        </form>
      </DrawerSection>
    </FactoryDrawer>
  );
}
