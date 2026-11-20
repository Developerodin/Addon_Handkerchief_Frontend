'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listProductionRacks, Machine, ProductionRack } from '@/shared/services/phase3CatalogService';
import { floorEquipmentFilter } from '@/shared/constants/productionFloors';
import { loadFloorMachines } from '../shared/floorCatalogCache';
import { BundleLabel } from './BundleLabel';
import { projectPourGoodSteps, SINGLE_PIECE_BUNDLE_SIZE } from './bundleProjection';
import { BundleRow, CutPieceRow, CutResult } from './types';

const fieldClass =
  'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

type PieceQty = { good: string; m4: string };

const emptyQty = (): PieceQty => ({ good: '', m4: '' });

const parseWhole = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

function stepDetail(step: { fromOpen: number; fromCut: number; partial: boolean }): string {
  if (step.fromOpen > 0 && step.fromCut > 0) {
    return `${step.fromOpen} already in bundle + ${step.fromCut} from this cut`;
  }
  if (step.fromCut > 0) {
    return `${step.fromCut} from this cut`;
  }
  if (step.fromOpen > 0) {
    return `${step.fromOpen} already in bundle`;
  }
  return step.partial ? 'partial, sealed after save' : '';
}

/**
 * Shows full bundles of 60 and partial sealed bundles; uses real bundle numbers and how much of this cut each row uses.
 */
function BundlePreview({
  openStart,
  openBundleNumber,
  goodAdd,
}: {
  openStart: number;
  openBundleNumber: number;
  goodAdd: number;
}) {
  if (goodAdd <= 0) return null;
  const steps = projectPourGoodSteps(openStart, openBundleNumber, goodAdd);
  if (!steps.length) return null;
  const fromCutTotal = steps.reduce((sum, row) => sum + row.fromCut, 0);
  return (
    <div className="grid gap-2 rounded border border-gray-200 bg-gray-50/80 p-3" aria-live="polite">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">Preview</p>
      {openStart > 0 ? (
        <p className="text-[10px] text-gray-600">
          Bundle #{openBundleNumber} already has {openStart} pcs — the next{' '}
          {Math.min(SINGLE_PIECE_BUNDLE_SIZE - openStart, goodAdd)} of your good qty finish that bundle first.
        </p>
      ) : null}
      {steps.map((step) => (
        <div
          key={`${step.bundleNumber}-${step.partial ? 'p' : 'f'}`}
          className="flex flex-col gap-0.5 rounded border border-purple-100 bg-white px-3 py-2 text-[11px]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-gray-900">
              Bundle #{step.bundleNumber}
              {step.partial ? ' (partial)' : ''}
            </span>
            <span className="font-medium text-purple-800">{step.qty} pcs</span>
          </div>
          {stepDetail(step) ? <span className="text-[10px] text-gray-600">{stepDetail(step)}</span> : null}
        </div>
      ))}
      <p className="text-[10px] font-medium text-gray-700">
        This cut: <strong>{goodAdd}</strong> good pcs → {fromCutTotal} pcs into bundles
        {openStart > 0 ? ` (incl. ${Math.min(SINGLE_PIECE_BUNDLE_SIZE - openStart, goodAdd)} to finish bundle #${openBundleNumber})` : ''}.
      </p>
    </div>
  );
}

/**
 * Starts hemmed pieces, records good and M4 counts, closes the hand bundle, and puts the label on a bundles rack.
 */
export function CutJobDrawer({
  piece,
  placeBundle,
  active,
  openBundles,
  onClose,
  onChanged,
}: {
  piece: CutPieceRow | null;
  placeBundle: BundleRow | null;
  active: CutPieceRow[];
  openBundles: BundleRow[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [pieces, setPieces] = useState<CutPieceRow[]>([]);
  const [phase, setPhase] = useState<'start' | 'count' | 'done'>('start');
  const [rackCode, setRackCode] = useState('');
  const [tableBarcode, setTableBarcode] = useState('');
  const [qtyByPiece, setQtyByPiece] = useState<Record<string, PieceQty>>({});
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
    setQtyByPiece({});
    setError('');
    setRackCode(piece?.rackCode || '');
    setTableBarcode(piece?.status === 'in-work' ? piece.machineBarcode : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the opened piece or bundle changes
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

  const printableBundles = useMemo(
    () => labels.filter((row) => row.closed && row.barcode),
    [labels]
  );

  const openStart = openBundle?.closed ? 0 : openBundle?.qty || 0;
  const nextBundleNumber = openBundle?.number || 1;

  if (!piece && !placeBundle) return null;

  const bundleRacks = racks.filter((rack) => rack.stockType === 'bundles');

  const setPieceQty = (barcode: string, field: keyof PieceQty, value: string) => {
    setQtyByPiece((current) => ({
      ...current,
      [barcode]: { ...(current[barcode] || emptyQty()), [field]: value },
    }));
  };

  /**
   * Puts the selected pieces on the table.
   */
  const start = async () => {
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/production/single-piece/start', {
        method: 'POST',
        body: JSON.stringify({
          pieceBarcodes: pieces.map((row) => row.barcode),
          rackCode,
          machineBarcode: tableBarcode,
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
   * Records good and M4 counts; the server fills bundles of 60.
   */
  const cut = async () => {
    const rows = pieces.map((row) => {
      const q = qtyByPiece[row.barcode] || emptyQty();
      return {
        barcode: row.barcode,
        goodQty: parseWhole(q.good),
        m4Qty: parseWhole(q.m4),
      };
    });
    if (rows.some((row) => Number.isNaN(row.goodQty) || Number.isNaN(row.m4Qty) || row.goodQty < 0 || row.m4Qty < 0)) {
      setError('Good and M4 must be whole numbers');
      return;
    }
    if (rows.some((row) => row.goodQty === 0 && row.m4Qty === 0)) {
      setError('Enter good qty or M4 qty');
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
      setLabels((existing) => {
        const byId = new Map(existing.map((row) => [row.id, row]));
        for (const row of closed) byId.set(row.id, row);
        return [...byId.values()].sort((a, b) => (a.number || 0) - (b.number || 0));
      });
      setOpenBundle(null);
      setPhase('done');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cut');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Puts the printed bundles on a bundles rack.
   */
  const place = async () => {
    const codes = printableBundles.map((row) => row.barcode);
    if (!codes.length) {
      setError('Save a cut that produces at least one bundle before putting on a rack');
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
            <input
              id="spRack"
              aria-label="Current rack"
              className={`${fieldClass} cursor-not-allowed bg-gray-50`}
              value={rackCode}
              autoComplete="off"
              readOnly
              disabled
            />
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="spTable">
              Table
            </label>
            <input
              id="spTable"
              aria-label="Table barcode"
              className={fieldClass}
              value={tableBarcode}
              autoComplete="off"
              placeholder="Scan table"
              onChange={(event) => setTableBarcode(event.target.value)}
              required
            />
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
            {openStart > 0 ? (
              <p className="text-[11px] text-gray-600">
                Open bundle #{openBundle?.number || '—'} already has <strong>{openStart}</strong> good pcs (counted toward the next full 60).
              </p>
            ) : null}
            {pieces.map((row) => {
              const qty = qtyByPiece[row.barcode] || emptyQty();
              const goodNum = parseWhole(qty.good);
              const goodForPreview = Number.isNaN(goodNum) ? 0 : goodNum;
              return (
                <div key={row.barcode} className="grid gap-3">
                  <p className="font-mono text-[12px] font-bold text-gray-900">
                    {row.barcode}
                    {row.rollBarcode ? <span className="ml-2 font-sans font-medium text-gray-500">roll {row.rollBarcode}</span> : null}
                  </p>
                  <label className="text-[11px] font-bold text-[#495057]" htmlFor={`good-${row.barcode}`}>
                    Good qty
                  </label>
                  <input
                    id={`good-${row.barcode}`}
                    aria-label={`Good qty ${row.barcode}`}
                    className={fieldClass}
                    inputMode="numeric"
                    value={qty.good}
                    onChange={(event) => setPieceQty(row.barcode, 'good', event.target.value)}
                    placeholder="0"
                  />
                  <label className="text-[11px] font-bold text-[#495057]" htmlFor={`m4-${row.barcode}`}>
                    M4 qty
                  </label>
                  <input
                    id={`m4-${row.barcode}`}
                    aria-label={`M4 qty ${row.barcode}`}
                    className={fieldClass}
                    inputMode="numeric"
                    value={qty.m4}
                    onChange={(event) => setPieceQty(row.barcode, 'm4', event.target.value)}
                    placeholder="0"
                  />
                  <BundlePreview openStart={openStart} openBundleNumber={nextBundleNumber} goodAdd={goodForPreview} />
                </div>
              );
            })}
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60" disabled={loading}>
              Save cut
            </button>
          </form>
        </DrawerSection>
      ) : null}
      {phase === 'done' ? (
        <DrawerSection title="Bundles">
          <div className="grid gap-3 p-3">
            {printableBundles.length ? (
              <div className="grid gap-3">
                {printableBundles.map((bundle) => (
                  <div key={bundle.id} className="grid gap-2 rounded border border-gray-200 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[12px] font-bold text-purple-700">{bundle.barcode}</span>
                      <span className="text-[11px] text-gray-700">
                        {bundle.qty === SINGLE_PIECE_BUNDLE_SIZE ? '60 pcs' : `${bundle.qty} pcs`}
                        {(bundle.m4Qty || 0) > 0 ? ` · M4 ${bundle.m4Qty}` : ''}
                      </span>
                    </div>
                    <BundleLabel bundle={bundle} printing={printId === bundle.id} />
                    <button
                      type="button"
                      className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50"
                      onClick={() => printLabel(bundle.id)}
                    >
                      Print label
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500">No closed bundles yet. Save a cut with enough good qty to close a bundle of 60.</p>
            )}
            <form
              className="grid gap-2 border-t border-gray-100 pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                place().catch(() => undefined);
              }}
            >
              <label className="text-[11px] font-bold text-[#495057]" htmlFor="spDest">
                Bundles rack
              </label>
              <input
                id="spDest"
                aria-label="Bundles rack"
                className={fieldClass}
                value={destRack}
                autoComplete="off"
                onChange={(event) => setDestRack(event.target.value)}
                required
              />
              <select aria-label="Bundles rack list" className={fieldClass} value={destRack} onChange={(event) => setDestRack(event.target.value)}>
                <option value="">Select rack</option>
                {bundleRacks.map((rack) => (
                  <option key={rack.id} value={rack.code}>
                    {rack.name} · {rack.code}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
                disabled={loading || !printableBundles.length}
              >
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