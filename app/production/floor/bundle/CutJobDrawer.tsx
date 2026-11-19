'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listProductionRacks, Machine, ProductionRack } from '@/shared/services/phase3CatalogService';
import { floorEquipmentFilter } from '@/shared/constants/productionFloors';
import { loadFloorMachines } from '../shared/floorCatalogCache';
import { BundleLabel } from './BundleLabel';
import { formatBundleProjection, projectPourGood, SINGLE_PIECE_BUNDLE_SIZE } from './bundleProjection';
import { emptyPieceCount, goodQtyFromEntry, m4QtyFromEntry, type PieceCountEntry } from './pieceCounts';
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
  active,
  openBundles,
  onClose,
  onChanged,
}: {
  piece: CutPieceRow | null;
  placeBundle: BundleRow | null;
  waiting: CutPieceRow[];
  active: CutPieceRow[];
  openBundles: BundleRow[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [pieces, setPieces] = useState<CutPieceRow[]>([]);
  const [phase, setPhase] = useState<'start' | 'count' | 'done'>('start');
  const [rackCode, setRackCode] = useState('');
  const [extraScan, setExtraScan] = useState('');
  const [tableBarcode, setTableBarcode] = useState('');
  const [counts, setCounts] = useState<Record<string, PieceCountEntry>>({});
  const [leftoverM4Qty, setLeftoverM4Qty] = useState('');
  const [labels, setLabels] = useState<BundleRow[]>([]);
  const [openBundle, setOpenBundle] = useState<BundleRow | null>(null);
  const [destRack, setDestRack] = useState('');
  const [printId, setPrintId] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [racks, setRacks] = useState<ProductionRack[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const jobKey = placeBundle?.id || piece?.barcode || '';

  useEffect(() => {
    if (!jobKey) return;
    if (piece) {
      const onTable =
        piece.status === 'in-work'
          ? active.filter(
              (row) => row.status === 'in-work' && row.orderId === piece.orderId && row.machineBarcode === piece.machineBarcode
            )
          : [piece];
      setPieces(onTable.length ? onTable : [piece]);
    } else {
      setPieces([]);
    }
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

  const orderId = piece?.orderId || placeBundle?.orderId || '';

  useEffect(() => {
    if (!orderId || phase === 'start') return;
    const latest = openBundles.find((row) => row.orderId === orderId) || null;
    setOpenBundle(latest);
  }, [openBundles, orderId, phase]);

  useEffect(() => {
    if (!jobKey) return;
    Promise.all([
      loadFloorMachines(floorEquipmentFilter('single-piece-cutting')),
      listProductionRacks({ page: 1, limit: 200, status: 'active' }),
    ])
      .then(([machineRows, rackPage]) => {
        setMachines(machineRows);
        setRacks(rackPage.results || []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load tables'));
  }, [jobKey]);

  const orderBundleRows = useMemo(() => {
    const byId = new Map<string, BundleRow>();
    for (const row of labels) {
      if (row.orderId === orderId) byId.set(row.id, row);
    }
    for (const row of openBundles) {
      if (row.orderId === orderId) byId.set(row.id, row);
    }
    if (openBundle?.orderId === orderId) byId.set(openBundle.id, openBundle);
    return [...byId.values()].sort((a, b) => (a.number || 0) - (b.number || 0));
  }, [labels, openBundles, openBundle, orderId]);

  const cutPreview = useMemo(() => {
    if (phase !== 'count') return null;
    const openQty = openBundle?.qty || 0;
    let sealedFull = 0;
    let openAfter = openQty;
    let cursorOpen = openQty;
    for (const row of pieces) {
      const entry = counts[row.barcode] || emptyPieceCount();
      const good = goodQtyFromEntry(entry);
      if (!Number.isInteger(good) || good < 0) continue;
      const step = projectPourGood(cursorOpen, good);
      sealedFull += step.sealedFull;
      openAfter = step.openAfter;
      cursorOpen = step.openAfter;
    }
    return { sealedFull, openAfter, text: formatBundleProjection(sealedFull, openAfter) };
  }, [phase, pieces, counts, openBundle?.qty]);

  const printableBundles = useMemo(
    () => labels.filter((row) => row.closed && row.barcode),
    [labels]
  );

  if (!piece && !placeBundle) return null;

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
   * Adds another hemmed piece onto the same table while counting.
   */
  const addPieceToTable = async () => {
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
    const machineBarcode = pieces[0]?.machineBarcode || tableBarcode;
    if (!machineBarcode) {
      setError('Table is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const started = await factoryRequest<CutPieceRow[]>('/production/single-piece/start', {
        method: 'POST',
        body: JSON.stringify({
          pieceBarcodes: [match.barcode],
          rackCode: match.rackCode,
          machineBarcode,
        }),
      });
      setPieces((rows) => [...rows, ...started.map((row) => ({ ...row, status: 'in-work' as const }))]);
      setExtraScan('');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this piece');
    } finally {
      setLoading(false);
    }
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
  const pieceEntry = (barcode: string): PieceCountEntry => counts[barcode] || emptyPieceCount();

  const addBundleLine = (barcode: string) => {
    setCounts((current) => {
      const entry = current[barcode] || emptyPieceCount();
      return { ...current, [barcode]: { ...entry, bundleLines: [...entry.bundleLines, SINGLE_PIECE_BUNDLE_SIZE] } };
    });
  };

  const updateBundleLine = (barcode: string, index: number, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    if (value !== '') {
      const qty = Number(value);
      if (qty < 1 || qty > SINGLE_PIECE_BUNDLE_SIZE) return;
    }
    setCounts((current) => {
      const entry = current[barcode] || emptyPieceCount();
      const bundleLines = [...entry.bundleLines];
      bundleLines[index] = value === '' ? SINGLE_PIECE_BUNDLE_SIZE : Number(value);
      return { ...current, [barcode]: { ...entry, bundleLines } };
    });
  };

  const removeBundleLine = (barcode: string, index: number) => {
    setCounts((current) => {
      const entry = current[barcode] || emptyPieceCount();
      return { ...current, [barcode]: { ...entry, bundleLines: entry.bundleLines.filter((_, i) => i !== index) } };
    });
  };

  const reclassifyLeftoverAsM4 = async (all: boolean) => {
    if (!orderId || !openBundle?.qty) {
      setError('There is no leftover good quantity in the open bundle');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: { orderId: string; all?: boolean; qty?: number } = { orderId };
      if (all) {
        body.all = true;
      } else {
        const qty = Number(leftoverM4Qty);
        if (!Number.isInteger(qty) || qty < 1 || qty > openBundle.qty) {
          setError(`Enter leftover qty between 1 and ${openBundle.qty}`);
          setLoading(false);
          return;
        }
        body.qty = qty;
      }
      const updated = await factoryRequest<BundleRow>('/production/single-piece/open/reclassify-m4', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setOpenBundle(updated);
      setLeftoverM4Qty('');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark leftover as M4');
    } finally {
      setLoading(false);
    }
  };

  const cut = async () => {
    const rows = pieces.map((row) => {
      const entry = pieceEntry(row.barcode);
      return {
        barcode: row.barcode,
        goodQty: goodQtyFromEntry(entry),
        m4Qty: m4QtyFromEntry(entry),
      };
    });
    if (rows.some((row) => !Number.isInteger(row.goodQty) || !Number.isInteger(row.m4Qty) || row.goodQty < 0 || row.m4Qty < 0)) {
      setError('Bundle, leftover, and M4 must be whole numbers');
      return;
    }
    if (rows.some((row) => row.goodQty === 0 && row.m4Qty === 0)) {
      setError('Add at least one bundle line, leftover good, or M4');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await factoryRequest<CutResult>('/production/single-piece/cut', {
        method: 'POST',
        body: JSON.stringify({ pieces: rows }),
      });
      const closed = result.closed || [];
      setLabels((rows) => {
        const byId = new Map(rows.map((row) => [row.id, row]));
        for (const row of closed) byId.set(row.id, row);
        return [...byId.values()].sort((a, b) => (a.number || 0) - (b.number || 0));
      });
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
  const closeBundle = async (options?: { continueCutting?: boolean }) => {
    setLoading(true);
    setError('');
    try {
      const closed = await factoryRequest<BundleRow>('/production/single-piece/close', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
      setLabels((rows) => [...rows, closed]);
      setOpenBundle(null);
      setPhase(options?.continueCutting ? 'count' : 'done');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the bundle');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Closes the partial open bundle early and keeps counting.
   */
  const sealPartialOpenBundle = () => {
    if (!openBundle || openBundle.qty < 1) {
      setError('Put at least one good handkerchief in the open bundle before sealing it');
      return;
    }
    closeBundle({ continueCutting: true }).catch(() => undefined);
  };

  /**
   * Puts the printed bundles on a bundles rack.
   */
  const place = async () => {
    const codes = printableBundles.map((row) => row.barcode);
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
            <div className="rounded border border-purple-100 bg-purple-50/60 p-2">
              <p className="text-[12px] font-bold text-gray-900" aria-live="polite">
                Leftover good (open bundle): {openBundle?.qty || 0} / 60
                {openBundle?.number ? ` · bundle #${openBundle.number}` : ''}
              </p>
              <p className="text-[10px] text-gray-600">Next piece on this order uses leftover good before starting new 60s.</p>
              <p className="mt-1 text-[10px] text-gray-600">
                One piece can fill many bundles: enter total good count (e.g. 600 → 10 bundles of 60) and press Cut.
              </p>
              {cutPreview?.text ? (
                <p className="mt-1 text-[11px] font-bold text-purple-800" aria-live="polite">
                  Cut will create: {cutPreview.text}
                </p>
              ) : null}
              {orderBundleRows.length ? (
                <ul className="mt-2 grid gap-1 border-t border-purple-100 pt-2">
                  {orderBundleRows.map((bundle) => (
                    <li key={bundle.id} className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-gray-800">
                      <span className="font-mono font-bold">{bundle.closed && bundle.barcode ? bundle.barcode : `Bundle #${bundle.number || '—'}`}</span>
                      <span>
                        {bundle.closed && bundle.qty === SINGLE_PIECE_BUNDLE_SIZE
                          ? '60 in bundle'
                          : `${bundle.qty} pcs`}
                        {(bundle.m4Qty || 0) > 0 ? ` · M4 ${bundle.m4Qty}` : ''}
                        {bundle.closed ? ' · closed' : ' · open leftover'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="spCountExtra">
              Another piece on this table
            </label>
            <div className="flex gap-2">
              <input
                id="spCountExtra"
                aria-label="Another piece barcode on table"
                className={fieldClass}
                value={extraScan}
                autoComplete="off"
                onChange={(event) => setExtraScan(event.target.value)}
              />
              <button
                type="button"
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50 disabled:opacity-60"
                disabled={loading}
                onClick={() => addPieceToTable().catch(() => undefined)}
              >
                Add piece
              </button>
            </div>
            {openBundle && openBundle.qty > 0 && !openBundle.closed ? (
              <div className="rounded border border-amber-200 bg-amber-50/80 p-2 text-[11px] text-amber-950">
                <p className="font-bold">Saved from earlier: {openBundle.qty} good pcs in open bundle #{openBundle.number || '—'}</p>
                <p className="mt-1 text-[10px]">Use on the next piece cut, or mark as M4 if not reusable.</p>
                <LabelledLeftoverM4
                  qty={openBundle.qty}
                  m4FieldId="spOpenLeftoverM4"
                  leftoverM4Qty={leftoverM4Qty}
                  loading={loading}
                  onQtyChange={setLeftoverM4Qty}
                  onMarkAll={() => reclassifyLeftoverAsM4(true).catch(() => undefined)}
                  onMarkPartial={() => reclassifyLeftoverAsM4(false).catch(() => undefined)}
                />
              </div>
            ) : null}
            {pieces.map((row) => {
              const entry = pieceEntry(row.barcode);
              return (
                <fieldset key={row.barcode} className="grid gap-2 border border-gray-200 p-2">
                  <legend className="px-1 font-mono text-[11px] font-bold text-gray-900">
                    {row.barcode}
                    {row.rollBarcode ? <span className="ml-2 font-sans font-medium text-gray-500">roll {row.rollBarcode}</span> : null}
                  </legend>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#495057]">Bundles (60 each)</span>
                    <button
                      type="button"
                      className="rounded border border-purple-200 bg-white px-2 py-1 text-[10px] font-bold text-purple-700 hover:bg-purple-50"
                      onClick={() => addBundleLine(row.barcode)}
                    >
                      Add bundle
                    </button>
                  </div>
                  {entry.bundleLines.length ? (
                    <ul className="grid gap-1">
                      {entry.bundleLines.map((lineQty, index) => (
                        <li key={`${row.barcode}-${index}`} className="flex items-center gap-2">
                          <span className="w-16 text-[10px] font-bold text-gray-500">#{index + 1}</span>
                          <input
                            aria-label={`Bundle ${index + 1} qty ${row.barcode}`}
                            className={fieldClass}
                            inputMode="numeric"
                            value={lineQty}
                            onChange={(event) => updateBundleLine(row.barcode, index, event.target.value)}
                          />
                          <button
                            type="button"
                            className="text-[10px] font-bold text-gray-400 hover:text-red-600"
                            aria-label={`Remove bundle line ${index + 1}`}
                            onClick={() => removeBundleLine(row.barcode, index)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-gray-500">Add a bundle line for each full 60, or use leftover only.</p>
                  )}
                  <label className="text-[11px] font-bold text-[#495057]" htmlFor={`left-${row.barcode}`}>
                    Leftover good (saved for next piece)
                  </label>
                  <input
                    id={`left-${row.barcode}`}
                    aria-label={`Leftover good ${row.barcode}`}
                    className={fieldClass}
                    inputMode="numeric"
                    value={entry.leftover}
                    onChange={(event) =>
                      setCounts((current) => ({
                        ...current,
                        [row.barcode]: { ...pieceEntry(row.barcode), leftover: event.target.value },
                      }))
                    }
                  />
                  <label className="text-[11px] font-bold text-[#495057]" htmlFor={`m4-${row.barcode}`}>
                    M4 from this piece (not in bundle qty)
                  </label>
                  <input
                    id={`m4-${row.barcode}`}
                    aria-label={`M4 ${row.barcode}`}
                    className={fieldClass}
                    inputMode="numeric"
                    value={entry.m4}
                    onChange={(event) =>
                      setCounts((current) => ({
                        ...current,
                        [row.barcode]: { ...pieceEntry(row.barcode), m4: event.target.value },
                      }))
                    }
                  />
                  {(() => {
                    const good = goodQtyFromEntry(entry);
                    if (!Number.isInteger(good) || good <= 0) return null;
                    const projected = projectPourGood(openBundle?.qty || 0, good);
                    return (
                      <p className="text-[10px] font-medium text-purple-800">
                        From this piece: {entry.bundleLines.length} bundle line(s) · {formatBundleProjection(projected.sealedFull, projected.openAfter)}
                      </p>
                    );
                  })()}
                </fieldset>
              );
            })}
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
            <button
              type="button"
              className="rounded border border-purple-200 bg-white px-3 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-50 disabled:opacity-60"
              disabled={loading || (openBundle?.qty || 0) < 1}
              onClick={sealPartialOpenBundle}
            >
              Seal partial open bundle
            </button>
          </form>
        </DrawerSection>
      ) : null}
      {phase === 'done' ? (
        <DrawerSection title="Bundle">
          <div className="grid gap-3 p-3">
            {openBundle && !openBundle.closed && openBundle.qty > 0 ? (
              <div className="rounded border border-amber-200 bg-amber-50/80 p-2">
                <p className="text-[12px] font-bold text-gray-900">
                  Leftover good: {openBundle.qty} pcs in open bundle #{openBundle.number || '—'}
                </p>
                <p className="text-[10px] text-gray-600">Scan the next piece on this order to use this qty, or mark as M4.</p>
                <LabelledLeftoverM4
                  qty={openBundle.qty}
                  m4FieldId="spDoneLeftoverM4"
                  leftoverM4Qty={leftoverM4Qty}
                  loading={loading}
                  onQtyChange={setLeftoverM4Qty}
                  onMarkAll={() => reclassifyLeftoverAsM4(true).catch(() => undefined)}
                  onMarkPartial={() => reclassifyLeftoverAsM4(false).catch(() => undefined)}
                />
              </div>
            ) : null}
            {orderBundleRows.length > 1 ? (
              <ul className="grid gap-1 rounded border border-gray-100 bg-gray-50/80 p-2">
                {orderBundleRows.map((bundle) => (
                  <li key={bundle.id} className="flex flex-wrap justify-between gap-2 text-[11px] text-gray-800">
                    <span className="font-mono font-bold">{bundle.barcode || `Bundle #${bundle.number}`}</span>
                    <span>
                      {bundle.closed && bundle.qty === SINGLE_PIECE_BUNDLE_SIZE ? '60 in bundle' : `${bundle.qty} pcs`}
                      {(bundle.m4Qty || 0) > 0 ? ` · M4 ${bundle.m4Qty}` : ''}
                      {' · '}
                      {bundle.closed ? 'closed' : 'open leftover'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {printableBundles.length > 1 ? (
              <p className="text-[12px] font-bold text-gray-900">
                {printableBundles.length} bundles to print (60 pcs each unless partial was closed)
              </p>
            ) : null}
            {printableBundles.map((bundle) => (
              <div key={bundle.id} className="grid gap-2">
                <BundleLabel bundle={bundle} printing={printId === bundle.id} />
                <button type="button" className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50" onClick={() => printLabel(bundle.id)}>
                  Print {bundle.barcode}
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
                <a className="text-[11px] font-bold text-purple-600 hover:text-purple-700" href="/catalog/production-racks">
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

function LabelledLeftoverM4({
  qty,
  m4FieldId,
  leftoverM4Qty,
  loading,
  onQtyChange,
  onMarkAll,
  onMarkPartial,
}: {
  qty: number;
  m4FieldId: string;
  leftoverM4Qty: string;
  loading: boolean;
  onQtyChange: (value: string) => void;
  onMarkAll: () => void;
  onMarkPartial: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="grid min-w-[100px] flex-1 gap-1 text-[10px] font-bold text-[#495057]" htmlFor={m4FieldId}>
        Mark as M4 (qty)
        <input
          id={m4FieldId}
          aria-label="Leftover quantity to mark as M4"
          className={fieldClass}
          inputMode="numeric"
          value={leftoverM4Qty}
          onChange={(event) => onQtyChange(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="rounded border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-bold text-[#495057] hover:bg-gray-50 disabled:opacity-60"
        disabled={loading || !leftoverM4Qty.trim()}
        onClick={onMarkPartial}
      >
        Mark qty as M4
      </button>
      <button
        type="button"
        className="rounded border border-amber-300 bg-white px-2 py-1.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        disabled={loading || qty < 1}
        onClick={onMarkAll}
      >
        Mark all {qty} as M4
      </button>
    </div>
  );
}
