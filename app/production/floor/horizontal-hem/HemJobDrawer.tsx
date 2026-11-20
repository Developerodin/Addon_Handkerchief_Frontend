'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { Machine, ProductionRack } from '@/shared/services/phase3CatalogService';
import { floorEquipmentFilter } from '@/shared/constants/productionFloors';
import { loadFloorMachines, loadFloorStorageRacks } from '../shared/floorCatalogCache';
import { HemBundle } from './types';

const fieldClass =
  'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

/**
 * Starts checked bundles on a machine, records sewing thread, and puts them on a bundles rack.
 */
export function HemJobDrawer({
  bundle,
  onClose,
  onChanged,
}: {
  bundle: HemBundle | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [bundles, setBundles] = useState<HemBundle[]>([]);
  const [onMachine, setOnMachine] = useState(false);
  const [rackCode, setRackCode] = useState('');
  const [machineBarcode, setMachineBarcode] = useState('');
  const [destination, setDestination] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [racks, setRacks] = useState<ProductionRack[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const jobKey = bundle?.id || '';

  useEffect(() => {
    if (!jobKey || !bundle) return;
    setBundles([bundle]);
    setOnMachine(!bundle.rackCode && Boolean(bundle.machineBarcode));
    setRackCode(bundle.rackCode || '');
    setMachineBarcode(bundle.machineBarcode || '');
    setDestination('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when a different bundle is opened
  }, [jobKey]);

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    Promise.all([
      loadFloorMachines(floorEquipmentFilter('horizontal-hem')),
      loadFloorStorageRacks(),
    ])
      .then(([machineRows, rackRows]) => {
        if (cancelled) return;
        setMachines(machineRows);
        setRacks(rackRows.filter((rack) => rack.stockType === 'bundles'));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load machines');
      });
    return () => {
      cancelled = true;
    };
  }, [bundle]);

  if (!bundle) return null;

  const thread = bundles[0]?.sewingThread || { lines: [], perPiece: 0 };
  const handkerchiefs = bundles.reduce((sum, row) => sum + (row.qty || 0), 0);
  const expected = thread.perPiece * handkerchiefs;

  /**
   * Puts the selected bundles on the machine.
   */
  const start = async () => {
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/production/horizontal-hem/start', {
        method: 'POST',
        body: JSON.stringify({
          bundleBarcodes: bundles.map((row) => row.barcode),
          rackCode,
          machineBarcode,
        }),
      });
      await onChanged();
      onClose();
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
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/production/horizontal-hem/place', {
        method: 'POST',
        body: JSON.stringify({
          bundleBarcodes: bundles.map((row) => row.barcode),
          rackCode: destination,
          threadQuantity: expected,
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
            <input
              id="hhRack"
              aria-label="Current rack"
              className={`${fieldClass} cursor-not-allowed bg-gray-50`}
              value={rackCode}
              autoComplete="off"
              readOnly
              disabled
            />
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
            <p className="text-[12px] text-gray-600">The hem is done. Sewing thread is from the order pin. Scan the bundles rack.</p>
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
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="hhThread">
              Thread used
            </label>
            <input
              id="hhThread"
              aria-label="Thread used"
              type="number"
              className={`${fieldClass} cursor-not-allowed bg-gray-50`}
              value={expected}
              readOnly
              disabled
            />
            <p className="text-[10px] text-gray-500">
              {handkerchiefs} handkerchief{handkerchiefs === 1 ? '' : 's'} × {thread.perPiece} per piece
            </p>
            {!racks.length ? (
              <p className="text-[12px] text-gray-600">
                No bundles racks are in the catalog.{' '}
                <Link className="font-bold text-purple-600 hover:text-purple-700" href="/catalog/production-racks">
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
