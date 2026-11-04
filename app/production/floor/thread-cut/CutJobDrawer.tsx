'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listMachines, listStorageRacks, Machine, StorageRack } from '@/shared/services/phase3CatalogService';
import { CutBundle } from './types';

const fieldClass =
  'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

/**
 * Starts hemmed bundles on a table and puts them back on a bundles rack. No thread is recorded.
 */
export function CutJobDrawer({
  bundle,
  waiting,
  onClose,
  onChanged,
}: {
  bundle: CutBundle | null;
  waiting: CutBundle[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [bundles, setBundles] = useState<CutBundle[]>([]);
  const [onTable, setOnTable] = useState(false);
  const [rackCode, setRackCode] = useState('');
  const [extraScan, setExtraScan] = useState('');
  const [tableBarcode, setTableBarcode] = useState('');
  const [destination, setDestination] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const jobKey = bundle?.id || '';

  useEffect(() => {
    if (!jobKey || !bundle) return;
    setBundles([bundle]);
    setOnTable(!bundle.rackCode && Boolean(bundle.machineBarcode));
    setRackCode(bundle.rackCode || '');
    setTableBarcode(bundle.machineBarcode || '');
    setDestination('');
    setError('');
  }, [jobKey, bundle]);

  useEffect(() => {
    if (!jobKey) return;
    Promise.all([listMachines({ page: 1, limit: 200, status: 'active' }), listStorageRacks({ page: 1, limit: 200, status: 'active' })])
      .then(([machinePage, rackPage]) => {
        setMachines(machinePage.results || []);
        setRacks((rackPage.results || []).filter((rack) => rack.stockType === 'bundles'));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load tables'));
  }, [jobKey]);

  if (!bundle) return null;

  /**
   * Adds another hemmed bundle from the same order on this rack.
   */
  const addBundle = () => {
    const needle = extraScan.trim().toLowerCase();
    const match = waiting.find((row) => row.barcode.toLowerCase() === needle);
    if (!match) {
      setError('This bundle is not on a rack for thread cutting');
      return;
    }
    if (match.orderId !== bundle.orderId) {
      setError('Bundles on one table must be the same order');
      return;
    }
    if (bundles.some((row) => row.barcode === match.barcode)) return;
    setBundles((rows) => [...rows, match]);
    setExtraScan('');
    setError('');
  };

  /**
   * Puts the selected bundles on the table.
   */
  const start = async () => {
    setLoading(true);
    setError('');
    try {
      const started = await factoryRequest<CutBundle[]>('/production/thread-cut/start', {
        method: 'POST',
        body: JSON.stringify({
          bundleBarcodes: bundles.map((row) => row.barcode),
          rackCode,
          machineBarcode: tableBarcode,
        }),
      });
      setBundles(started.map((row) => ({ ...bundles.find((current) => current.barcode === row.barcode), ...row })));
      setOnTable(true);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Puts the cut bundles on a bundles rack.
   */
  const place = async () => {
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/production/thread-cut/place', {
        method: 'POST',
        body: JSON.stringify({
          bundleBarcodes: bundles.map((row) => row.barcode),
          rackCode: destination,
        }),
      });
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not put bundles on the rack');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FactoryDrawer open title="Thread cutting" subtitle={bundle.orderNumber || bundle.orderId.slice(-6)} onClose={onClose}>
      <DrawerSection title="Bundles">
        <ul className="grid gap-2 p-3">
          {bundles.map((row) => (
            <li key={row.barcode} className="text-[12px] text-gray-900">
              <span className="font-mono font-bold">{row.barcode}</span>
              <span className="text-gray-600"> · {row.qty} pcs · {row.orderNumber || row.orderId.slice(-6)}</span>
            </li>
          ))}
        </ul>
      </DrawerSection>
      {!onTable ? (
        <DrawerSection title="Start">
          <form
            className="grid gap-3 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              start().catch(() => undefined);
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="tcRack">
              Current rack
            </label>
            <input id="tcRack" aria-label="Current rack" className={fieldClass} value={rackCode} autoComplete="off" onChange={(event) => setRackCode(event.target.value)} required />
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="tcExtra">
              Another bundle on this rack
            </label>
            <div className="flex gap-2">
              <input id="tcExtra" aria-label="Another bundle barcode" className={fieldClass} value={extraScan} autoComplete="off" onChange={(event) => setExtraScan(event.target.value)} />
              <button type="button" className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50" onClick={addBundle}>
                Add
              </button>
            </div>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="tcTable">
              Table
            </label>
            <input id="tcTable" aria-label="Table barcode" className={fieldClass} value={tableBarcode} autoComplete="off" placeholder="Scan table" onChange={(event) => setTableBarcode(event.target.value)} required />
            <select aria-label="Table" className={fieldClass} value={tableBarcode} onChange={(event) => setTableBarcode(event.target.value)}>
              <option value="">Select table</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.barcode || ''}>
                  {machine.name} · {machine.barcode}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60" disabled={loading}>
              Start
            </button>
          </form>
        </DrawerSection>
      ) : (
        <DrawerSection title="Put away">
          <form
            className="grid gap-3 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              place().catch(() => undefined);
            }}
          >
            <p className="text-[12px] text-gray-600">The threads are cut. Scan the bundles rack.</p>
            {!racks.length ? (
              <p className="text-[12px] text-gray-600">
                No bundles racks are in the catalog.{' '}
                <Link className="font-bold text-purple-600 hover:text-purple-700" href="/catalog/storage-racks">
                  Bundle racks
                </Link>
              </p>
            ) : null}
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="tcDestination">
              Bundles rack
            </label>
            <input id="tcDestination" aria-label="Bundles rack" className={fieldClass} value={destination} autoComplete="off" onChange={(event) => setDestination(event.target.value)} required />
            <select aria-label="Bundles rack list" className={fieldClass} value={destination} onChange={(event) => setDestination(event.target.value)}>
              <option value="">Select rack</option>
              {racks.map((rack) => (
                <option key={rack.id} value={rack.code}>
                  {rack.name} · {rack.code}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60" disabled={loading}>
              Put on rack
            </button>
          </form>
        </DrawerSection>
      )}
      {error ? (
        <p className="px-3 pb-3 text-[12px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </FactoryDrawer>
  );
}
