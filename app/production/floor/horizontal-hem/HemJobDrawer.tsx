'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listMachines, listStorageRacks, Machine, StorageRack } from '@/shared/services/phase3CatalogService';
import { HemBundle } from './types';

const fieldClass =
  'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

/**
 * Starts checked bundles on a machine, records sewing thread, and puts them on a bundles rack.
 */
export function HemJobDrawer({
  bundle,
  waiting,
  onClose,
  onChanged,
}: {
  bundle: HemBundle | null;
  waiting: HemBundle[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [bundles, setBundles] = useState<HemBundle[]>([]);
  const [onMachine, setOnMachine] = useState(false);
  const [rackCode, setRackCode] = useState('');
  const [extraScan, setExtraScan] = useState('');
  const [machineBarcode, setMachineBarcode] = useState('');
  const [threadUsed, setThreadUsed] = useState('');
  const [destination, setDestination] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const jobKey = bundle?.id || '';

  useEffect(() => {
    if (!jobKey || !bundle) return;
    setBundles([bundle]);
    setOnMachine(!bundle.rackCode && Boolean(bundle.machineBarcode));
    setRackCode(bundle.rackCode || '');
    setMachineBarcode(bundle.machineBarcode || '');
    setThreadUsed('');
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
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load machines'));
  }, [jobKey]);

  if (!bundle) return null;

  const thread = bundles[0]?.sewingThread || { lines: [], perPiece: 0 };
  const handkerchiefs = bundles.reduce((sum, row) => sum + (row.qty || 0), 0);
  const expected = thread.perPiece * handkerchiefs;
  const overPin = thread.lines.length > 0 && threadUsed !== '' && Number(threadUsed) > expected;

  /**
   * Adds another checked bundle from the same order on this rack.
   */
  const addBundle = () => {
    const needle = extraScan.trim().toLowerCase();
    const match = waiting.find((row) => row.barcode.toLowerCase() === needle);
    if (!match) {
      setError('This bundle is not on a rack for horizontal hemming');
      return;
    }
    if (match.orderId !== bundle.orderId) {
      setError('Bundles on one machine must be the same order');
      return;
    }
    if (bundles.some((row) => row.barcode === match.barcode)) return;
    setBundles((rows) => [...rows, match]);
    setExtraScan('');
    setError('');
  };

  /**
   * Puts the selected bundles on the machine.
   */
  const start = async () => {
    setLoading(true);
    setError('');
    try {
      const started = await factoryRequest<HemBundle[]>('/production/horizontal-hem/start', {
        method: 'POST',
        body: JSON.stringify({
          bundleBarcodes: bundles.map((row) => row.barcode),
          rackCode,
          machineBarcode,
        }),
      });
      setBundles(
        started.map((row) => ({
          ...bundles.find((current) => current.barcode === row.barcode),
          ...row,
          sewingThread: bundles.find((current) => current.barcode === row.barcode)?.sewingThread || thread,
        }))
      );
      setOnMachine(true);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Records the hem, the thread used, and the bundles rack.
   */
  const place = async () => {
    if (threadUsed === '' || Number.isNaN(Number(threadUsed)) || Number(threadUsed) < 0) {
      setError('Thread quantity is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/production/horizontal-hem/place', {
        method: 'POST',
        body: JSON.stringify({
          bundleBarcodes: bundles.map((row) => row.barcode),
          rackCode: destination,
          threadQuantity: Number(threadUsed),
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
    <FactoryDrawer open title="Horizontal hemming" subtitle={bundle.orderNumber || bundle.orderId.slice(-6)} onClose={onClose}>
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
      {!onMachine ? (
        <DrawerSection title="Start">
          <form
            className="grid gap-3 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              start().catch(() => undefined);
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="hhRack">
              Current rack
            </label>
            <input id="hhRack" aria-label="Current rack" className={fieldClass} value={rackCode} autoComplete="off" onChange={(event) => setRackCode(event.target.value)} required />
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="hhExtra">
              Another bundle on this rack
            </label>
            <div className="flex gap-2">
              <input id="hhExtra" aria-label="Another bundle barcode" className={fieldClass} value={extraScan} autoComplete="off" onChange={(event) => setExtraScan(event.target.value)} />
              <button type="button" className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50" onClick={addBundle}>
                Add
              </button>
            </div>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="hhMachine">
              Machine
            </label>
            <input id="hhMachine" aria-label="Machine barcode" className={fieldClass} value={machineBarcode} autoComplete="off" placeholder="Scan machine" onChange={(event) => setMachineBarcode(event.target.value)} required />
            <select aria-label="Machine" className={fieldClass} value={machineBarcode} onChange={(event) => setMachineBarcode(event.target.value)}>
              <option value="">Select machine</option>
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
            <p className="text-[12px] text-gray-600">The hem is done. Enter the sewing thread used, then scan the bundles rack.</p>
            {thread.lines.length ? (
              <ul className="grid gap-1 text-[12px] text-gray-700">
                {thread.lines.map((line) => (
                  <li key={`${line.name}-${line.perPiece}`}>
                    {line.name} · {line.perPiece} per piece
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-gray-600">No sewing thread is pinned on this order.</p>
            )}
            <p className="text-[12px] text-gray-600">
              Expected for {handkerchiefs} handkerchief{handkerchiefs === 1 ? '' : 's'}: {expected}
            </p>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="hhThread">
              Thread used
            </label>
            <input
              id="hhThread"
              aria-label="Thread used"
              type="number"
              min="0"
              step="any"
              className={fieldClass}
              value={threadUsed}
              onChange={(event) => setThreadUsed(event.target.value)}
              required
            />
            {overPin ? <p className="text-[12px] text-amber-700">Over the pinned quantity. It will be stored and the pin stays as it is.</p> : null}
            {!racks.length ? (
              <p className="text-[12px] text-gray-600">
                No bundles racks are in the catalog.{' '}
                <Link className="font-bold text-purple-600 hover:text-purple-700" href="/catalog/storage-racks">
                  Bundle racks
                </Link>
              </p>
            ) : null}
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="hhDestination">
              Bundles rack
            </label>
            <input id="hhDestination" aria-label="Bundles rack" className={fieldClass} value={destination} autoComplete="off" onChange={(event) => setDestination(event.target.value)} required />
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
