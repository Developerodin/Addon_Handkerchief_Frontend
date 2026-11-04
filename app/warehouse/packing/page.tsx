'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest, ClientOrderRow } from '@/shared/services/factoryApi';
import { FloorBundle } from '@/app/production/floor/shared/StationPage';

const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';
const headClass = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase text-[#495057]';
const cellClass = 'border border-gray-200 px-1.5 py-2 text-[12px]';

interface LoosePack {
  id: string;
  barcode: string;
  qty: number;
  orderNumber: string;
  pieceBundleBarcode: string;
}

interface PackBoard {
  results: FloorBundle[];
  loose: LoosePack[];
  counts: { waiting: number; onStation: number };
}

/**
 * Packs final-checking good quantity into packing-bundle barcodes, then into one box.
 */
export default function PackingPage() {
  const [board, setBoard] = useState<PackBoard>({ results: [], loose: [], counts: { waiting: 0, onStation: 0 } });
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<FloorBundle | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [clientOrderId, setClientOrderId] = useState('');
  const [orders, setOrders] = useState<ClientOrderRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await factoryRequest<PackBoard>('/warehouse/packing/upcoming');
    setBoard({ results: data.results || [], loose: data.loose || [], counts: data.counts || { waiting: 0, onStation: 0 } });
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load packing'));
    factoryRequest<{ results: ClientOrderRow[] }>('/warehouse/orders?page=1&limit=100')
      .then((page) => setOrders(page.results || []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load client orders'));
  }, [load]);

  /**
   * Seals the checked packing bundles into one box.
   */
  const makeBox = async () => {
    setSaving(true);
    setError('');
    try {
      await factoryRequest('/warehouse/packing/box', {
        method: 'POST',
        body: JSON.stringify({ packingBundleBarcodes: picked, clientOrderId: clientOrderId || undefined }),
      });
      setPicked([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Box failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireCrudPermission path="Warehouse / Packing" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Packing" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Packing</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{board.counts.waiting}</span>
          </div>
          <form
            className="mb-4 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const match = board.results.find((row) => row.barcode.toLowerCase() === scan.trim().toLowerCase());
              if (!match) setError('This bundle is not ready for packing');
              else {
                setJob(match);
                setError('');
              }
              setScan('');
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="pkScan">Bundle barcode</label>
            <input id="pkScan" aria-label="Bundle barcode" className="w-48 rounded border border-gray-200 px-3 py-1.5 text-[11px]" value={scan} onChange={(event) => setScan(event.target.value)} required />
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">Open</button>
          </form>
          {error ? <p className="mb-3 text-[12px] text-red-600" role="alert">{error}</p> : null}
          <table className="mb-6 w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">{['Bundle', 'Order', 'Left', 'Rack'].map((label) => <th key={label} className={headClass}>{label}</th>)}</tr>
            </thead>
            <tbody>
              {board.results.length ? board.results.map((row) => (
                <tr key={row.id}>
                  <td className={cellClass}><button type="button" className="font-mono font-medium text-purple-600" onClick={() => setJob(row)}>{row.barcode}</button></td>
                  <td className={cellClass}>{row.orderNumber}</td>
                  <td className={cellClass}>{row.finalGood - (row.packedQty || 0)}</td>
                  <td className={cellClass}>{row.rackCode}</td>
                </tr>
              )) : <tr><td colSpan={4} className="border border-gray-200 py-10 text-center text-[11px] text-gray-400">No good quantity is waiting on a packing rack.</td></tr>}
            </tbody>
          </table>
          <h2 className="mb-2 text-[12px] font-bold text-gray-800">Packing bundles not in a box</h2>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="pkClient">Client order</label>
            <select id="pkClient" aria-label="Client order" className="w-56 rounded border border-gray-200 px-2 py-1.5 text-[11px]" value={clientOrderId} onChange={(event) => setClientOrderId(event.target.value)}>
              <option value="">None</option>
              {orders.map((order) => <option key={order.id} value={order.id}>{order.clientName}</option>)}
            </select>
            <button type="button" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={!picked.length || saving} onClick={() => makeBox().catch(() => undefined)}>Make box</button>
          </div>
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">{['', 'Barcode', 'Pieces', 'From'].map((label) => <th key={label || 'pick'} className={headClass}>{label}</th>)}</tr>
            </thead>
            <tbody>
              {board.loose.length ? board.loose.map((row) => (
                <tr key={row.id}>
                  <td className={cellClass}>
                    <input
                      type="checkbox"
                      aria-label={row.barcode}
                      checked={picked.includes(row.barcode)}
                      onChange={(event) => setPicked((prev) => (event.target.checked ? [...prev, row.barcode] : prev.filter((code) => code !== row.barcode)))}
                    />
                  </td>
                  <td className={`${cellClass} font-mono`}>{row.barcode}</td>
                  <td className={cellClass}>{row.qty}</td>
                  <td className={cellClass}>{row.pieceBundleBarcode}</td>
                </tr>
              )) : <tr><td colSpan={4} className="border border-gray-200 py-10 text-center text-[11px] text-gray-400">No packing bundle is waiting for a box.</td></tr>}
            </tbody>
          </table>
        </div>
        <PackDrawer bundle={job} onClose={() => setJob(null)} onChanged={load} />
      </div>
    </RequireCrudPermission>
  );
}

/**
 * One packing bundle off the remaining good count.
 */
function PackDrawer({ bundle, onClose, onChanged }: { bundle: FloorBundle | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const [count, setCount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const left = bundle ? bundle.finalGood - (bundle.packedQty || 0) : 0;

  useEffect(() => {
    if (!bundle) return;
    const size = bundle.packingSize || 0;
    setCount(String(size > 0 && left >= size ? size : left));
    setError('');
  }, [bundle, left]);

  return (
    <FactoryDrawer title="Packing" subtitle={bundle?.barcode} open={Boolean(bundle)} onClose={onClose}>
      <DrawerSection title="Count">
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!bundle) return;
            setSaving(true);
            setError('');
            try {
              await factoryRequest('/warehouse/packing/pack', {
                method: 'POST',
                body: JSON.stringify({ bundleBarcode: bundle.barcode, pieceCount: Number(count) }),
              });
              onClose();
              await onChanged();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Packing failed');
            } finally {
              setSaving(false);
            }
          }}
        >
          <p className="text-[12px] text-gray-600">{left} left. Pack {bundle?.packingSize || 'the style size'}, or the leftover when it is smaller.</p>
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="pkCount">Piece count</label>
          <input id="pkCount" aria-label="Piece count" className={fieldClass} inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} required />
          {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
          <button type="submit" className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving}>Pack</button>
        </form>
      </DrawerSection>
    </FactoryDrawer>
  );
}
