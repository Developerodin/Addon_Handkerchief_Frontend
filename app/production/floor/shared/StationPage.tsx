'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { Container, Machine, ProductionRack } from '@/shared/services/phase3CatalogService';
import { floorEquipmentFilter } from '@/shared/constants/productionFloors';
import { loadFloorBundleContainers, loadFloorMachines, loadFloorStorageRacks } from './floorCatalogCache';
import { CompletedQueueTable, CompletedRow } from './CompletedQueueTable';
import { EmptyQueue, QueueTabs } from './QueueTabs';
import { BundleLabel, triggerBundleLabelPrint } from '@/shared/components/factory/BundleLabel';

export interface FloorBundle {
  id: string;
  barcode: string;
  orderId: string;
  orderNumber: string;
  qty: number;
  finalGood: number;
  packedQty?: number;
  packingSize?: number;
  rackCode: string;
  machineBarcode: string;
  containerBarcode: string;
  process: string;
  route: string;
}

interface FloorBoard {
  results: FloorBundle[];
  active: FloorBundle[];
  completed?: CompletedRow[];
  counts: { waiting: number; onStation: number; doneToday: number; onRack: number; completed?: number };
}

const EMPTY = { waiting: 0, onStation: 0, doneToday: 0, onRack: 0, completed: 0 };
const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';
const headClass = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#495057]';
const cellClass = 'border border-gray-200 px-1.5 py-2.5 text-[12px] text-gray-900';

type StartMode = 'machine' | 'rack-machine' | 'none';
type PlaceMode = 'bundles' | 'container' | 'count' | 'packing';

/**
 * Catalog console for a bundle station: scan onto a machine, then put the bundle away.
 */
export function StationPage({
  title,
  permission,
  base,
  empty,
  miss,
  start,
  place,
  stationLabel,
  floorStage,
  thread,
}: {
  title: string;
  permission: string;
  base: string;
  empty: string;
  miss: string;
  start: StartMode;
  place: PlaceMode;
  stationLabel: string;
  /** Process.floor code for catalog machine filtering */
  floorStage: string;
  thread?: boolean;
}) {
  const [board, setBoard] = useState<FloorBoard>({ results: [], active: [], counts: EMPTY });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<FloorBundle | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await factoryRequest<FloorBoard>(`${base}/upcoming`);
      setBoard({
        results: data.results || [],
        active: data.active || [],
        completed: data.completed || [],
        counts: {
          ...EMPTY,
          ...(data.counts || {}),
          completed: data.counts?.completed ?? (data.completed?.length || 0),
        },
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bundles');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  /**
   * Opens a bundle that is on this screen.
   * @param {string} code
   */
  const openScanned = (code: string) => {
    const needle = code.trim().toLowerCase();
    const match = [...board.results, ...board.active].find((row) => row.barcode.toLowerCase() === needle);
    if (!match) {
      setError(miss);
      return;
    }
    setJob(match);
    setError('');
  };

  const tiles = useMemo(
    () =>
      [
        ['waiting', 'Bundles waiting'],
        ['onStation', start === 'none' ? 'In progress' : `On the ${stationLabel.toLowerCase()}`],
        ['doneToday', 'Done today'],
        ['onRack', 'Put away'],
      ] as const,
    [start, stationLabel]
  );

  const openJob = useCallback((row: FloorBundle) => setJob(row), []);
  const refreshBoard = useCallback(() => load({ silent: true }), [load]);

  return (
    <RequireCrudPermission path={permission} action="read">
      <style>{'@media print { body * { visibility: hidden; } #bundle-label, #bundle-label * { visibility: visible; } #bundle-label { position: absolute; left: 0; top: 0; } }'}</style>
      <div className="main-content !p-[10px]">
        <Seo title={title} />
        <div className="relative border border-gray-100 bg-white shadow-sm">
          <div className="p-[10px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-[3px] rounded-full bg-purple-600" />
                <h1 className="text-sm font-bold text-gray-800">{title}</h1>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{board.counts.waiting}</span>
              </div>
              <button type="button" className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] shadow-sm hover:bg-gray-50" onClick={() => load().catch(() => undefined)} disabled={loading}>
                Refresh
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label={`${title} counts`}>
              {tiles.map(([key, label]) => (
                <div key={key} className="rounded border border-purple-100 bg-purple-50 px-3 py-2 text-purple-700">
                  <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-gray-900">{board.counts[key]}</p>
                </div>
              ))}
            </div>
            <form
              className="mb-4 flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                openScanned(scan);
                setScan('');
              }}
            >
              <label className="text-[11px] font-bold text-[#495057]" htmlFor={`${base}-scan`}>Bundle barcode</label>
              <input id={`${base}-scan`} aria-label="Bundle barcode" className="w-48 rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0" value={scan} autoComplete="off" placeholder="Scan bundle" onChange={(event) => setScan(event.target.value)} required />
              <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700">Open</button>
            </form>
            {error ? <p className="mb-3 text-[12px] text-red-600" role="alert">{error}</p> : null}
            {loading && !board.results.length && !board.active.length ? (
              <p className="py-16 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Loading Data</p>
            ) : (
              <BundleTable rows={board.results} active={board.active} completed={board.completed || []} empty={empty} onOpen={openJob} />
            )}
          </div>
        </div>
        {job ? (
          <JobDrawer
            bundle={job}
            waiting={board.results}
            base={base}
            title={title}
            start={start}
            place={place}
            stationLabel={stationLabel}
            floorStage={floorStage}
            thread={thread}
            miss={miss}
            onClose={() => setJob(null)}
            onChanged={refreshBoard}
          />
        ) : null}
      </div>
    </RequireCrudPermission>
  );
}

/**
 * Waiting bundles and bundles already on the station.
 */
const BundleTable = memo(function BundleTable({
  rows,
  active,
  completed,
  empty,
  onOpen,
}: {
  rows: FloorBundle[];
  active: FloorBundle[];
  completed: CompletedRow[];
  empty: string;
  onOpen: (row: FloorBundle) => void;
}) {
  return (
    <QueueTabs
      upcomingCount={rows.length}
      receivedCount={active.length}
      completedCount={completed.length}
      upcoming={(
      <div className="min-h-[240px] overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              {['Bundle', 'Order', 'Qty', 'Rack'].map((label) => (
                <th key={label} className={headClass}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.id}>
                <td className={cellClass}><button type="button" className="font-mono font-medium text-purple-600 hover:text-purple-700" onClick={() => onOpen(row)}>{row.barcode}</button></td>
                <td className={cellClass}>{row.orderNumber || row.orderId.slice(-6)}</td>
                <td className={cellClass}>{row.finalGood || row.qty}</td>
                <td className={cellClass}>{row.rackCode || row.containerBarcode || '—'}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      received={active.length ? (
        <div>
          <table className="w-full border-collapse border border-gray-200">
            <tbody>
              {active.map((row) => (
                <tr key={row.id}>
                  <td className={cellClass}><button type="button" className="font-mono font-medium text-purple-600" onClick={() => onOpen(row)}>{row.barcode}</button></td>
                  <td className={cellClass}>{row.orderNumber}</td>
                  <td className={cellClass}>{row.finalGood || row.qty}</td>
                  <td className={cellClass}>{row.machineBarcode || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyQueue text="Nothing has been received on this floor yet." />
      )}
      completed={<CompletedQueueTable rows={completed} codeLabel="Bundle" qtyIsTransferable />}
    />
  );
});

/**
 * Start and put-away for one bundle.
 */
function JobDrawer({
  bundle, waiting, base, title, start, place, stationLabel, floorStage, thread, miss, onClose, onChanged,
}: {
  bundle: FloorBundle | null;
  waiting: FloorBundle[];
  base: string;
  title: string;
  start: StartMode;
  place: PlaceMode;
  stationLabel: string;
  floorStage: string;
  thread?: boolean;
  miss: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [bundles, setBundles] = useState<FloorBundle[]>([]);
  const [onStation, setOnStation] = useState(false);
  const [rackCode, setRackCode] = useState('');
  const [station, setStation] = useState('');
  const [destination, setDestination] = useState('');
  const [count, setCount] = useState('');
  const [threadQty, setThreadQty] = useState('');
  const [printBarcode, setPrintBarcode] = useState('');
  const [extra, setExtra] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [racks, setRacks] = useState<ProductionRack[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const jobKey = bundle?.id || '';

  useEffect(() => {
    if (!jobKey || !bundle) return;
    setBundles([bundle]);
    setOnStation(start !== 'none' && !bundle.rackCode && !bundle.containerBarcode && Boolean(bundle.machineBarcode));
    setRackCode(bundle.rackCode || '');
    setStation(bundle.machineBarcode || '');
    setDestination('');
    setCount(String(bundle.finalGood || ''));
    setThreadQty('');
    setError('');
  }, [jobKey, bundle, start]);

  const needsMachines = start !== 'none';
  const needsRacks = place === 'bundles' || place === 'packing' || start === 'rack-machine';
  const needsContainers = place === 'container';

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    const tasks: Promise<void>[] = [];
    if (needsMachines) {
      tasks.push(
        loadFloorMachines(floorEquipmentFilter(floorStage, stationLabel)).then((rows) => {
          if (!cancelled) setMachines(rows);
        })
      );
    }
    if (needsRacks) {
      const stock = place === 'packing' ? 'packing' : 'bundles';
      tasks.push(
        loadFloorStorageRacks().then((rows) => {
          if (!cancelled) setRacks(rows.filter((rack) => rack.stockType === stock));
        })
      );
    }
    if (needsContainers) {
      tasks.push(loadFloorBundleContainers().then((rows) => { if (!cancelled) setContainers(rows); }));
    }
    if (!tasks.length) return;
    Promise.all(tasks).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the catalog');
    });
    return () => {
      cancelled = true;
    };
  }, [bundle, floorStage, needsContainers, needsMachines, needsRacks, place, stationLabel]);

  if (!bundle) return null;

  const codes = () => bundles.map((row) => row.barcode);

  /**
   * Adds another waiting bundle from the same order.
   */
  const addBundle = () => {
    const match = waiting.find((row) => row.barcode.toLowerCase() === extra.trim().toLowerCase());
    if (!match) {
      setError(miss);
      return;
    }
    if (match.orderId !== bundle.orderId) {
      setError('Bundles on one station must be the same order');
      return;
    }
    if (!bundles.some((row) => row.barcode === match.barcode)) setBundles((rows) => [...rows, match]);
    setExtra('');
    setError('');
  };

  /**
   * Starts the bundles on the station.
   */
  const begin = async () => {
    setLoading(true);
    setError('');
    try {
      await factoryRequest(`${base}/start`, {
        method: 'POST',
        body: JSON.stringify({ bundleBarcodes: codes(), rackCode, machineBarcode: station }),
      });
      setOnStation(true);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Puts the bundles away, or records the piece count.
   */
  const finish = async () => {
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { bundleBarcodes: codes() };
      if (place === 'container') body.containerBarcode = destination;
      else if (place === 'count') body.pieceCount = Number(count);
      else body.rackCode = destination;
      if (thread) body.threadQuantity = threadQty === '' ? '' : Number(threadQty);
      await factoryRequest(place === 'count' ? `${base}/break` : `${base}/place`, { method: 'POST', body: JSON.stringify(body) });
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish');
    } finally {
      setLoading(false);
    }
  };

  const showStart = start !== 'none' && !onStation;
  return (
    <FactoryDrawer open title={title} subtitle={bundle.orderNumber || bundle.orderId.slice(-6)} onClose={onClose}>
      <DrawerSection title="Bundles">
        <ul className="grid gap-2 p-3">
          {bundles.map((row) => (
            <li key={row.barcode} className="flex flex-wrap items-center gap-2 text-[12px] text-gray-900">
              <span className="font-mono font-bold">{row.barcode}</span>
              <span className="text-gray-600"> · {row.finalGood || row.qty} pcs</span>
              {row.barcode ? (
                <button
                  type="button"
                  className="rounded border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-[#495057] hover:bg-gray-50"
                  onClick={() => {
                    setPrintBarcode(row.barcode);
                    window.setTimeout(() => triggerBundleLabelPrint(), 0);
                  }}
                >
                  Print label
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {printBarcode ? (
          <BundleLabel
            printing
            bundle={{
              barcode: printBarcode,
              orderId: bundle.orderId,
              orderNumber: bundle.orderNumber,
              qty: bundles.find((row) => row.barcode === printBarcode)?.qty || bundle.qty,
            }}
          />
        ) : null}
      </DrawerSection>
      {showStart ? (
        <DrawerSection title="Start">
          <form className="grid gap-3 p-3" onSubmit={(event) => { event.preventDefault(); begin().catch(() => undefined); }}>
            {start === 'rack-machine' ? (
              <>
                <label className="text-[11px] font-bold text-[#495057]" htmlFor="stRack">Current rack</label>
                <input id="stRack" aria-label="Current rack" className={fieldClass} value={rackCode} onChange={(event) => setRackCode(event.target.value)} required />
                <select aria-label="Bundles rack list" className={fieldClass} value={rackCode} onChange={(event) => setRackCode(event.target.value)}>
                  <option value="">Select rack</option>
                  {racks.map((rack) => (
                    <option key={rack.id} value={rack.code}>
                      {rack.name} · {rack.code}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="stExtra">Another bundle</label>
            <div className="flex gap-2">
              <input id="stExtra" aria-label="Another bundle barcode" className={fieldClass} value={extra} onChange={(event) => setExtra(event.target.value)} />
              <button type="button" className="rounded border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-[#495057]" onClick={addBundle}>Add</button>
            </div>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="stStation">{stationLabel}</label>
            <input id="stStation" aria-label={`${stationLabel} barcode`} className={fieldClass} value={station} onChange={(event) => setStation(event.target.value)} required />
            <select aria-label={stationLabel} className={fieldClass} value={station} onChange={(event) => setStation(event.target.value)}>
              <option value="">Select</option>
              {machines.map((machine) => <option key={machine.id} value={machine.barcode || ''}>{machine.name} · {machine.barcode}</option>)}
            </select>
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60" disabled={loading}>Start</button>
          </form>
        </DrawerSection>
      ) : (
        <DrawerSection title={place === 'count' ? 'Count' : 'Put away'}>
          <form className="grid gap-3 p-3" onSubmit={(event) => { event.preventDefault(); finish().catch(() => undefined); }}>
            {place === 'count' ? (
              <>
                <label className="text-[11px] font-bold text-[#495057]" htmlFor="stCount">Piece count</label>
                <input id="stCount" aria-label="Piece count" className={fieldClass} inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} required />
              </>
            ) : null}
            {place === 'container' ? (
              <>
                <label className="text-[11px] font-bold text-[#495057]" htmlFor="stContainer">Container</label>
                <input id="stContainer" aria-label="Container barcode" className={fieldClass} value={destination} onChange={(event) => setDestination(event.target.value)} required />
                <select aria-label="Container list" className={fieldClass} value={destination} onChange={(event) => setDestination(event.target.value)}>
                  <option value="">Select container</option>
                  {containers.map((row) => <option key={row.id} value={row.code}>{row.name} · {row.code}</option>)}
                </select>
                {!containers.length ? <p className="text-[12px] text-gray-600">No bundle containers are in the catalog. <Link className="font-bold text-purple-600" href="/catalog/containers">Containers</Link></p> : null}
              </>
            ) : null}
            {place === 'bundles' || place === 'packing' ? (
              <>
                {thread ? (
                  <>
                    <label className="text-[11px] font-bold text-[#495057]" htmlFor="stThread">Embroidery thread</label>
                    <input id="stThread" aria-label="Embroidery thread" className={fieldClass} inputMode="decimal" value={threadQty} onChange={(event) => setThreadQty(event.target.value)} required />
                  </>
                ) : null}
                <label className="text-[11px] font-bold text-[#495057]" htmlFor="stDest">{place === 'packing' ? 'Packing rack' : 'Bundles rack'}</label>
                <input id="stDest" aria-label={place === 'packing' ? 'Packing rack' : 'Bundles rack'} className={fieldClass} value={destination} onChange={(event) => setDestination(event.target.value)} required />
                <select aria-label="Rack list" className={fieldClass} value={destination} onChange={(event) => setDestination(event.target.value)}>
                  <option value="">Select rack</option>
                  {racks.map((rack) => <option key={rack.id} value={rack.code}>{rack.name} · {rack.code}</option>)}
                </select>
                {!racks.length ? <p className="text-[12px] text-gray-600"><Link className="font-bold text-purple-600" href="/catalog/production-racks">Production racks</Link></p> : null}
              </>
            ) : null}
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60" disabled={loading}>{place === 'count' ? 'Break bundle' : 'Put away'}</button>
          </form>
        </DrawerSection>
      )}
      {error ? <p className="px-3 pb-3 text-[12px] text-red-600" role="alert">{error}</p> : null}
    </FactoryDrawer>
  );
}
