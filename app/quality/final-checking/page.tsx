'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listStorageRacks, StorageRack } from '@/shared/services/phase3CatalogService';
import { FloorBundle } from '@/app/production/floor/shared/StationPage';
import { EmptyQueue, QueueTabs } from '@/app/production/floor/shared/QueueTabs';

const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

/**
 * Final checking. Normal arrives after the break. Embroidery and sticker arrive after the second iron.
 */
export default function FinalCheckingPage() {
  const [rows, setRows] = useState<FloorBundle[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<FloorBundle | null>(null);

  const load = useCallback(async () => {
    const data = await factoryRequest<{ results: FloorBundle[]; counts: { waiting: number } }>('/quality/final-checking/upcoming');
    setRows(data.results || []);
    setWaiting(data.counts?.waiting || 0);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load bundles'));
  }, [load]);

  return (
    <RequireCrudPermission path="Quality / Final checking" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Final checking" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Final checking</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{waiting}</span>
          </div>
          <form className="mb-4 flex gap-2" onSubmit={(event) => {
            event.preventDefault();
            const match = rows.find((row) => row.barcode.toLowerCase() === scan.trim().toLowerCase());
            if (!match) setError('This bundle is not ready for final checking');
            else { setJob(match); setError(''); }
            setScan('');
          }}>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="fcScan">Bundle barcode</label>
            <input id="fcScan" aria-label="Bundle barcode" className="w-48 rounded border border-gray-200 px-3 py-1.5 text-[11px]" value={scan} onChange={(event) => setScan(event.target.value)} required />
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">Open</button>
          </form>
          {error ? <p className="mb-3 text-[12px] text-red-600" role="alert">{error}</p> : null}
          <QueueTabs
            upcomingCount={rows.length}
            receivedCount={0}
            upcoming={(
          <table className="w-full border-collapse border border-gray-200">
            <thead><tr className="bg-gray-50/30">{['Bundle', 'Order', 'Good', 'Rack'].map((label) => <th key={label} className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase text-[#495057]">{label}</th>)}</tr></thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]"><button type="button" className="font-mono font-medium text-purple-600" onClick={() => setJob(row)}>{row.barcode}</button></td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.orderNumber}</td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.finalGood}</td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.rackCode}</td>
                </tr>
              )) : <tr><td colSpan={4} className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">Nothing is waiting for final checking.</td></tr>}
            </tbody>
          </table>
            )}
            received={<EmptyQueue text="A bundle leaves Upcoming after final checking is saved." />}
          />
        </div>
        <CheckDrawer bundle={job} onClose={() => setJob(null)} onChanged={load} />
      </div>
    </RequireCrudPermission>
  );
}

/**
 * Good and defect counts. Good quantity goes to a packing rack.
 */
function CheckDrawer({ bundle, onClose, onChanged }: { bundle: FloorBundle | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const [good, setGood] = useState('');
  const [defect, setDefect] = useState('0');
  const [rackCode, setRackCode] = useState('');
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bundle) return;
    setGood(String(bundle.finalGood || 0));
    setDefect('0');
    setRackCode('');
    setError('');
    listStorageRacks({ page: 1, limit: 200, status: 'active' })
      .then((page) => setRacks((page.results || []).filter((rack) => rack.stockType === 'packing')))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load racks'));
  }, [bundle]);

  if (!bundle) return null;

  /**
   * Saves final checking and the packing rack for the good count.
   */
  const save = async () => {
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/quality/final-checking', {
        method: 'POST',
        body: JSON.stringify({ bundleBarcode: bundle.barcode, good: Number(good), defect: Number(defect), rackCode }),
      });
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save final checking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FactoryDrawer open title="Final checking" subtitle={bundle.barcode} onClose={onClose}>
      <DrawerSection title="Counts">
        <form className="grid gap-3 p-3" onSubmit={(event) => { event.preventDefault(); save().catch(() => undefined); }}>
          <p className="text-[12px] text-gray-600">Good and defect must sum to {bundle.finalGood}.</p>
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="fcGood">Good</label>
          <input id="fcGood" aria-label="Good quantity" className={fieldClass} inputMode="numeric" value={good} onChange={(event) => setGood(event.target.value)} required />
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="fcDefect">Defect</label>
          <input id="fcDefect" aria-label="Defect quantity" className={fieldClass} inputMode="numeric" value={defect} onChange={(event) => setDefect(event.target.value)} required />
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="fcRack">Packing rack</label>
          <input id="fcRack" aria-label="Packing rack" className={fieldClass} value={rackCode} onChange={(event) => setRackCode(event.target.value)} />
          <select aria-label="Packing rack list" className={fieldClass} value={rackCode} onChange={(event) => setRackCode(event.target.value)}>
            <option value="">Select rack</option>
            {racks.map((rack) => <option key={rack.id} value={rack.code}>{rack.name} · {rack.code}</option>)}
          </select>
          {!racks.length ? <p className="text-[12px] text-gray-600"><Link className="font-bold text-purple-600" href="/catalog/storage-racks">Storage racks</Link></p> : null}
          <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60" disabled={loading}>Save</button>
          {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
        </form>
      </DrawerSection>
    </FactoryDrawer>
  );
}
