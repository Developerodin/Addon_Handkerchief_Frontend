'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';

const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

interface ShipBox {
  id: string;
  barcode: string;
  pieceQty: number;
  rackCode?: string;
  scaleWeight: number;
}

/**
 * Scans a box off its rack. The same box event does not ship twice.
 */
export default function DispatchPage() {
  const [rows, setRows] = useState<ShipBox[]>([]);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<ShipBox | null>(null);

  const load = useCallback(async () => {
    const data = await factoryRequest<{ results: ShipBox[] }>('/warehouse/dispatch/upcoming');
    setRows(data.results || []);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load dispatch'));
  }, [load]);

  return (
    <RequireCrudPermission path="Warehouse / Dispatch" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Dispatch" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Dispatch</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{rows.length}</span>
          </div>
          <form
            className="mb-4 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const match = rows.find((row) => row.barcode.toLowerCase() === scan.trim().toLowerCase());
              if (!match) setError('This box is not on a rack');
              else {
                setJob(match);
                setError('');
              }
              setScan('');
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="dsScan">Box barcode</label>
            <input id="dsScan" aria-label="Box barcode" className="w-48 rounded border border-gray-200 px-3 py-1.5 text-[11px]" value={scan} onChange={(event) => setScan(event.target.value)} required />
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">Open</button>
          </form>
          {error ? <p className="mb-3 text-[12px] text-red-600" role="alert">{error}</p> : null}
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">{['Box', 'Pieces', 'Weight', 'Rack'].map((label) => <th key={label} className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase text-[#495057]">{label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]"><button type="button" className="font-mono font-medium text-purple-600" onClick={() => setJob(row)}>{row.barcode}</button></td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.pieceQty}</td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.scaleWeight}</td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.rackCode}</td>
                </tr>
              )) : <tr><td colSpan={4} className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">No box is on a rack.</td></tr>}
            </tbody>
          </table>
        </div>
        <ShipDrawer box={job} onClose={() => setJob(null)} onChanged={load} />
      </div>
    </RequireCrudPermission>
  );
}

/**
 * Vehicle number for one box leaving the rack.
 */
function ShipDrawer({ box, onClose, onChanged }: { box: ShipBox | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const [vehicle, setVehicle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVehicle('');
    setError('');
  }, [box]);

  return (
    <FactoryDrawer title="Dispatch" subtitle={box?.barcode} open={Boolean(box)} onClose={onClose}>
      <DrawerSection title="Vehicle">
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!box) return;
            setSaving(true);
            setError('');
            try {
              await factoryRequest('/warehouse/dispatch/ship', {
                method: 'POST',
                body: JSON.stringify({ boxBarcode: box.barcode, vehicleNumber: vehicle, eventId: `ship-${box.barcode}`, site: 'factory' }),
              });
              onClose();
              await onChanged();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Dispatch failed');
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="dsVehicle">Vehicle number</label>
          <input id="dsVehicle" aria-label="Vehicle number" className={fieldClass} value={vehicle} onChange={(event) => setVehicle(event.target.value)} required />
          {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
          <button type="submit" className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving}>Dispatch</button>
        </form>
      </DrawerSection>
    </FactoryDrawer>
  );
}
