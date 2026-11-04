'use client';

import React, { useEffect, useState } from 'react';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listMachines, listStorageRacks, Machine, StorageRack } from '@/shared/services/phase3CatalogService';
import { BundleLabel } from './BundleLabel';
import { BundleRow, CutPieceRow, CutResult } from './types';

const fieldClass =
  'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

/**
 * Starts hemmed pieces, records good and M4 counts, closes the hand bundle, and puts the label on a bundles rack.
 */
export function CutJobDrawer({
  piece,
  placeBundle,
  waiting,
  openBundles,
  onClose,
  onChanged,
}: {
  piece: CutPieceRow | null;
  placeBundle: BundleRow | null;
  waiting: CutPieceRow[];
  openBundles: BundleRow[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [pieces, setPieces] = useState<CutPieceRow[]>([]);
  const [phase, setPhase] = useState<'start' | 'count' | 'done'>('start');
  const [rackCode, setRackCode] = useState('');
  const [extraScan, setExtraScan] = useState('');
  const [tableBarcode, setTableBarcode] = useState('');
  const [counts, setCounts] = useState<Record<string, { good: string; m4: string }>>({});
  const [labels, setLabels] = useState<BundleRow[]>([]);
  const [openBundle, setOpenBundle] = useState<BundleRow | null>(null);
  const [destRack, setDestRack] = useState('');
  const [printId, setPrintId] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const jobKey = placeBundle?.id || piece?.barcode || '';

  useEffect(() => {
    if (!jobKey) return;
    setPieces(piece ? [piece] : []);
    setPhase(placeBundle ? 'done' : piece?.status === 'in-work' ? 'count' : 'start');
    setLabels(placeBundle ? [placeBundle] : []);
    setOpenBundle(openBundles.find((row) => row.orderId === (piece?.orderId || placeBundle?.orderId)) || null);
    setCounts({});
    setError('');
    setRackCode(piece?.rackCode || '');
    setTableBarcode(piece?.status === 'in-work' ? piece.machineBarcode : '');
    // Reset only when the opened piece or bundle changes. A board refresh must not wipe the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobKey]);

  useEffect(() => {
    if (!jobKey) return;
    Promise.all([listMachines({ page: 1, limit: 200, status: 'active' }), listStorageRacks({ page: 1, limit: 200, status: 'active' })])
      .then(([machinePage, rackPage]) => {
        setMachines(machinePage.results || []);
        setRacks(rackPage.results || []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load tables'));
  }, [jobKey]);

  if (!piece && !placeBundle) return null;

  const orderId = piece?.orderId || placeBundle?.orderId || '';
  const bundleRacks = racks.filter((rack) => rack.stockType === 'bundles');

  /**
   * Adds another hemmed piece from the same order that is on the scanned rack.
   */
  const addPiece = () => {
    const needle = extraScan.trim().toLowerCase();
    const match = waiting.find((row) => row.barcode.toLowerCase() === needle);
    if (!match) {
      setError('This piece is not on a rack for single piece cutting');
      return;
    }
    if (match.orderId !== orderId) {
      setError('Pieces on one table must be the same order');
      return;
    }
    if (pieces.some((row) => row.barcode === match.barcode)) return;
    setPieces((rows) => [...rows, match]);
    setExtraScan('');
    setError('');
  };

  /**
   * Puts the selected pieces on the table.
   */
  const start = async () => {
    setLoading(true);
    setError('');
    try {
      const started = await factoryRequest<CutPieceRow[]>('/production/single-piece/start', {
        method: 'POST',
        body: JSON.stringify({
          pieceBarcodes: pieces.map((row) => row.barcode),
          rackCode,
          machineBarcode: tableBarcode,
        }),
      });
      setPieces(started.map((row) => ({ ...row, status: 'in-work' as const })));
      setPhase('count');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cuts the table pieces. Full bundles of 60 come back with a barcode.
   */
  const cut = async () => {
    const rows = pieces.map((row) => ({
      barcode: row.barcode,
      goodQty: Number(counts[row.barcode]?.good ?? ''),
      m4Qty: Number(counts[row.barcode]?.m4 ?? ''),
    }));
    if (rows.some((row) => !Number.isInteger(row.goodQty) || !Number.isInteger(row.m4Qty) || row.goodQty < 0 || row.m4Qty < 0)) {
      setError('Count must be a whole number');
      return;
    }
    if (rows.some((row) => row.goodQty === 0 && row.m4Qty === 0)) {
      setError('Count is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await factoryRequest<CutResult>('/production/single-piece/cut', {
        method: 'POST',
        body: JSON.stringify({ pieces: rows }),
      });
      setLabels(result.closed || []);
      setOpenBundle((result.open || []).find((row) => row.orderId === orderId) || null);
      setPhase('done');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cut');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Closes the open bundle at the counted quantity.
   */
  const closeBundle = async () => {
    setLoading(true);
    setError('');
    try {
      const closed = await factoryRequest<BundleRow>('/production/single-piece/close', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
      setLabels((rows) => [...rows, closed]);
      setOpenBundle(null);
      setPhase('done');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the bundle');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Puts the printed bundles on a bundles rack.
   */
  const place = async () => {
    const codes = labels.map((row) => row.barcode).filter(Boolean);
    if (!codes.length) {
      setError('Close the bundle before putting it on a rack');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/production/single-piece/place', {
        method: 'POST',
        body: JSON.stringify({ bundleBarcodes: codes, rackCode: destRack }),
      });
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not put the bundle on the rack');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Prints one bundle label.
   * @param {string} id
   */
  const printLabel = (id: string) => {
    setPrintId(id);
    window.setTimeout(() => window.print(), 0);
  };

  return (
    <FactoryDrawer open title="Single piece cutting" subtitle={piece?.orderNumber || placeBundle?.orderNumber || orderId.slice(-6)} onClose={onClose}>
      {phase === 'start' ? (
        <DrawerSection title="Start">
          <form
            className="grid gap-3 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              start().catch(() => undefined);
            }}
          >
            <ul className="grid gap-1">
              {pieces.map((row) => (
                <li key={row.barcode} className="font-mono text-[12px] font-bold text-gray-900">
                  {row.barcode}
                </li>
              ))}
            </ul>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="spRack">
              Current rack
            </label>
            <input id="spRack" aria-label="Current rack" className={fieldClass} value={rackCode} autoComplete="off" onChange={(event) => setRackCode(event.target.value)} required />
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="spExtra">
              Another piece on this rack
            </label>
            <div className="flex gap-2">
              <input id="spExtra" aria-label="Another piece barcode" className={fieldClass} value={extraScan} autoComplete="off" onChange={(event) => setExtraScan(event.target.value)} />
              <button type="button" className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50" onClick={addPiece}>
                Add
              </button>
            </div>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="spTable">
              Table
            </label>
            <input id="spTable" aria-label="Table barcode" className={fieldClass} value={tableBarcode} autoComplete="off" placeholder="Scan table" onChange={(event) => setTableBarcode(event.target.value)} required />
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
      ) : null}
      {phase === 'count' ? (
        <DrawerSection title="Count">
          <form
            className="grid gap-3 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              cut().catch(() => undefined);
            }}
          >
            <p className="text-[12px] font-bold text-gray-900" aria-live="polite">
              Open bundle {openBundle?.qty || 0} / 60
            </p>
            {pieces.map((row) => (
              <fieldset key={row.barcode} className="grid gap-2 border border-gray-200 p-2">
                <legend className="px-1 font-mono text-[11px] font-bold text-gray-900">{row.barcode}</legend>
                <label className="text-[11px] font-bold text-[#495057]" htmlFor={`good-${row.barcode}`}>
                  Good handkerchiefs
                </label>
                <input
                  id={`good-${row.barcode}`}
                  aria-label={`Good handkerchiefs ${row.barcode}`}
                  className={fieldClass}
                  inputMode="numeric"
                  value={counts[row.barcode]?.good ?? ''}
                  onChange={(event) => setCounts((current) => ({ ...current, [row.barcode]: { good: event.target.value, m4: current[row.barcode]?.m4 ?? '' } }))}
                  required
                />
                <label className="text-[11px] font-bold text-[#495057]" htmlFor={`m4-${row.barcode}`}>
                  M4
                </label>
                <input
                  id={`m4-${row.barcode}`}
                  aria-label={`M4 ${row.barcode}`}
                  className={fieldClass}
                  inputMode="numeric"
                  value={counts[row.barcode]?.m4 ?? ''}
                  onChange={(event) => setCounts((current) => ({ ...current, [row.barcode]: { good: current[row.barcode]?.good ?? '', m4: event.target.value } }))}
                />
              </fieldset>
            ))}
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60" disabled={loading}>
              Cut
            </button>
            <button
              type="button"
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50 disabled:opacity-60"
              disabled={loading || (openBundle?.qty || 0) < 1}
              onClick={() => closeBundle().catch(() => undefined)}
            >
              Close bundle
            </button>
          </form>
        </DrawerSection>
      ) : null}
      {phase === 'done' ? (
        <DrawerSection title="Bundle">
          <div className="grid gap-3 p-3">
            {openBundle && !openBundle.closed ? (
              <p className="text-[12px] font-bold text-gray-900">Open bundle {openBundle.qty} / 60</p>
            ) : null}
            {labels.map((bundle) => (
              <div key={bundle.id} className="grid gap-2">
                <BundleLabel bundle={bundle} printing={printId === bundle.id} />
                <button type="button" className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50" onClick={() => printLabel(bundle.id)}>
                  Print
                </button>
              </div>
            ))}
            {openBundle && !openBundle.closed && openBundle.qty > 0 ? (
              <button type="button" className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50 disabled:opacity-60" disabled={loading} onClick={() => closeBundle().catch(() => undefined)}>
                Close bundle
              </button>
            ) : null}
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                place().catch(() => undefined);
              }}
            >
              <label className="text-[11px] font-bold text-[#495057]" htmlFor="spDest">
                Bundles rack
              </label>
              <input id="spDest" aria-label="Bundles rack" className={fieldClass} value={destRack} autoComplete="off" onChange={(event) => setDestRack(event.target.value)} required />
              <select aria-label="Bundles rack list" className={fieldClass} value={destRack} onChange={(event) => setDestRack(event.target.value)}>
                <option value="">Select rack</option>
                {bundleRacks.map((rack) => (
                  <option key={rack.id} value={rack.code}>
                    {rack.name} · {rack.code}
                  </option>
                ))}
              </select>
              {bundleRacks.length ? null : (
                <a className="text-[11px] font-bold text-purple-600 hover:text-purple-700" href="/catalog/storage-racks">
                  Bundle racks
                </a>
              )}
              <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60" disabled={loading || !labels.length}>
                Put on rack
              </button>
            </form>
          </div>
        </DrawerSection>
      ) : null}
      {error ? (
        <p className="px-3 pb-3 text-[12px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </FactoryDrawer>
  );
}
