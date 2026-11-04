'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { FloorBundle } from '@/app/production/floor/shared/StationPage';
import { EmptyQueue, QueueTabs } from '@/app/production/floor/shared/QueueTabs';

const GRADES = ['long', 'hemming', 'sporting', 'diving', 'rejection'] as const;
const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

interface Board {
  results: FloorBundle[];
  counts: { waiting: number; doneToday: number; onRack: number };
}

/**
 * Final QC for a thread-cut bundle. Six counts must sum to the bundle.
 */
export default function FinalQcPage() {
  const [rows, setRows] = useState<FloorBundle[]>([]);
  const [counts, setCounts] = useState({ waiting: 0, doneToday: 0, onRack: 0 });
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<FloorBundle | null>(null);

  const load = useCallback(async () => {
    const data = await factoryRequest<Board>('/quality/final-qc/upcoming');
    setRows(data.results || []);
    setCounts({ waiting: data.counts?.waiting || 0, doneToday: data.counts?.doneToday || 0, onRack: data.counts?.onRack || 0 });
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load bundles'));
  }, [load]);

  /**
   * Opens a thread-cut bundle that is still on a rack.
   * @param {string} code
   */
  const openScanned = (code: string) => {
    const match = rows.find((row) => row.barcode.toLowerCase() === code.trim().toLowerCase());
    if (!match) {
      setError('This bundle is not waiting for final QC');
      return;
    }
    setJob(match);
    setError('');
  };

  return (
    <RequireCrudPermission path="Quality / Final QC" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Final QC" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Final QC</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{counts.waiting}</span>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2" aria-label="Final QC counts">
            <Tile label="Bundles waiting" value={counts.waiting} />
            <Tile label="Passed today" value={counts.doneToday} />
            <Tile label="Good bundles" value={counts.onRack} />
          </div>
          <form className="mb-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); openScanned(scan); setScan(''); }}>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="fqScan">Bundle barcode</label>
            <input id="fqScan" aria-label="Bundle barcode" className="w-48 rounded border border-gray-200 px-3 py-1.5 text-[11px]" value={scan} onChange={(event) => setScan(event.target.value)} required />
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">Open</button>
          </form>
          {error ? <p className="mb-3 text-[12px] text-red-600" role="alert">{error}</p> : null}
          <QueueTabs
            upcomingCount={rows.length}
            receivedCount={0}
            upcoming={(
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">{['Bundle', 'Order', 'Qty', 'Rack'].map((label) => <th key={label} className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase text-[#495057]">{label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]"><button type="button" className="font-mono font-medium text-purple-600" onClick={() => setJob(row)}>{row.barcode}</button></td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.orderNumber}</td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.qty}</td>
                  <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.rackCode}</td>
                </tr>
              )) : <tr><td colSpan={4} className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">No thread-cut bundle is waiting on a rack.</td></tr>}
            </tbody>
          </table>
            )}
            received={<EmptyQueue text="A bundle leaves Upcoming after final QC is saved." />}
          />
        </div>
        <QcDrawer bundle={job} onClose={() => setJob(null)} onChanged={load} />
      </div>
    </RequireCrudPermission>
  );
}

/**
 * @param {{ label: string, value: number }} props
 */
function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-purple-100 bg-purple-50 px-3 py-2 text-purple-700">
      <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

/**
 * Six counts and a rack for each defect that is above zero.
 */
function QcDrawer({ bundle, onClose, onChanged }: { bundle: FloorBundle | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const [good, setGood] = useState('0');
  const [grades, setGrades] = useState<Record<string, string>>({ long: '0', hemming: '0', sporting: '0', diving: '0', rejection: '0' });
  const [racks, setRacks] = useState<Record<string, string>>({ long: '', hemming: '', sporting: '', diving: '', rejection: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bundle) return;
    setGood(String(bundle.qty));
    setGrades({ long: '0', hemming: '0', sporting: '0', diving: '0', rejection: '0' });
    setRacks({ long: '', hemming: '', sporting: '', diving: '', rejection: '' });
    setError('');
  }, [bundle]);

  if (!bundle) return null;

  /**
   * Saves the six counts for this bundle.
   */
  const save = async () => {
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { bundleBarcode: bundle.barcode, good: Number(good), racks };
      for (const grade of GRADES) body[grade] = Number(grades[grade] || 0);
      await factoryRequest('/quality/final-qc', { method: 'POST', body: JSON.stringify(body) });
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save final QC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FactoryDrawer open title="Final QC" subtitle={bundle.barcode} onClose={onClose}>
      <DrawerSection title={bundle.orderNumber || 'Bundle'}>
        <form className="grid gap-3 p-3" onSubmit={(event) => { event.preventDefault(); save().catch(() => undefined); }}>
          <p className="text-[12px] text-gray-600">Counts must sum to {bundle.qty}.</p>
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="fqGood">Good</label>
          <input id="fqGood" aria-label="Good quantity" className={fieldClass} inputMode="numeric" value={good} onChange={(event) => setGood(event.target.value)} required />
          {GRADES.map((grade) => (
            <div key={grade} className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold capitalize text-[#495057]" htmlFor={`fq-${grade}`}>{grade}</label>
                <input id={`fq-${grade}`} aria-label={`${grade} quantity`} className={fieldClass} inputMode="numeric" value={grades[grade]} onChange={(event) => setGrades((current) => ({ ...current, [grade]: event.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#495057]" htmlFor={`fq-rack-${grade}`}>Rack</label>
                <input id={`fq-rack-${grade}`} aria-label={`${grade} rack`} className={fieldClass} value={racks[grade]} onChange={(event) => setRacks((current) => ({ ...current, [grade]: event.target.value }))} />
              </div>
            </div>
          ))}
          <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60" disabled={loading}>Save</button>
          {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
        </form>
      </DrawerSection>
    </FactoryDrawer>
  );
}
