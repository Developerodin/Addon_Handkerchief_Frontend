'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { factoryRequest } from '@/shared/services/factoryApi';
import { CutJobDrawer } from './CutJobDrawer';
import { PieceTable } from './PieceTable';
import { BundleRow, CutPieceRow, SinglePieceBoard } from './types';

const TILES = [
  ['waiting', 'Pieces waiting', 'border-amber-200 bg-amber-50 text-amber-700'],
  ['onTable', 'On the table', 'border-sky-100 bg-sky-50 text-sky-700'],
  ['openQty', 'Open bundle', 'border-purple-100 bg-purple-50 text-purple-700'],
  ['closedToday', 'Bundles closed today', 'border-emerald-100 bg-emerald-50 text-emerald-700'],
] as const;

const EMPTY_COUNTS = { waiting: 0, onTable: 0, openQty: 0, closedToday: 0 };

/**
 * Single piece cutting console. A hemmed piece is counted into bundles of 60 and the label goes on a bundles rack.
 */
export default function SinglePiecePage() {
  const [board, setBoard] = useState<SinglePieceBoard>({ results: [], active: [], openBundles: [], ready: [], counts: EMPTY_COUNTS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<CutPieceRow | null>(null);
  const [placeBundle, setPlaceBundle] = useState<BundleRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await factoryRequest<SinglePieceBoard>('/production/single-piece/upcoming');
      setBoard({
        results: data.results || [],
        active: data.active || [],
        openBundles: data.openBundles || [],
        ready: data.ready || [],
        counts: { ...EMPTY_COUNTS, ...(data.counts || {}) },
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load pieces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  /**
   * Opens the job for a scanned piece barcode.
   * @param {string} code
   */
  const openScanned = (code: string) => {
    const needle = code.trim().toLowerCase();
    const match = [...board.results, ...board.active].find((row) => row.barcode.toLowerCase() === needle);
    if (!match) {
      setError('This piece is not on a rack for single piece cutting');
      return;
    }
    setPlaceBundle(null);
    setJob(match);
    setError('');
  };

  return (
    <RequireCrudPermission path="Production / Single piece cutting" action="read">
      <style>{'@media print { body * { visibility: hidden; } #bundle-label, #bundle-label * { visibility: visible; } #bundle-label { position: absolute; left: 0; top: 0; } }'}</style>
      <div className="main-content !p-[10px]">
        <Seo title="Single piece cutting" />
        <div className="relative border border-gray-100 bg-white shadow-sm">
          <div className="p-[10px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-[3px] rounded-full bg-purple-600" />
                <h1 className="text-sm font-bold text-gray-800">Single piece cutting</h1>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{board.counts.waiting}</span>
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] shadow-sm hover:bg-gray-50 disabled:opacity-60"
                onClick={() => load().catch(() => undefined)}
                disabled={loading}
              >
                <i className={`ri-refresh-line text-xs ${loading ? 'animate-spin' : ''}`} aria-hidden /> Refresh
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Single piece cutting counts">
              {TILES.map(([key, label, tone]) => (
                <div key={key} className={`rounded border px-3 py-2 ${tone}`}>
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
              <label className="text-[11px] font-bold text-[#495057]" htmlFor="spScan">
                Piece barcode
              </label>
              <input
                id="spScan"
                aria-label="Piece barcode"
                className="w-48 min-w-[120px] rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] placeholder:text-gray-400 focus:border-purple-300 focus:ring-0"
                value={scan}
                autoComplete="off"
                placeholder="Scan piece"
                onChange={(event) => setScan(event.target.value)}
                required
              />
              <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700">
                Open
              </button>
            </form>
            {error ? (
              <p className="mb-3 text-[12px] text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            {loading && !board.results.length && !board.active.length ? (
              <div className="flex flex-col items-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600 opacity-50" />
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Loading Data</p>
              </div>
            ) : (
              <PieceTable
                pieces={board.results}
                active={board.active}
                ready={board.ready}
                onOpen={(row) => {
                  setPlaceBundle(null);
                  setJob(row);
                }}
                onPlace={(bundle) => {
                  setJob(null);
                  setPlaceBundle(bundle);
                }}
              />
            )}
          </div>
        </div>
        <CutJobDrawer
          piece={job}
          placeBundle={placeBundle}
          waiting={board.results}
          openBundles={board.openBundles}
          onClose={() => {
            setJob(null);
            setPlaceBundle(null);
          }}
          onChanged={load}
        />
      </div>
    </RequireCrudPermission>
  );
}
