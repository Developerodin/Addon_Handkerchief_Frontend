'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { factoryRequest } from '@/shared/services/factoryApi';
import { HemJobDrawer } from './HemJobDrawer';
import { HemPieceTable } from './HemPieceTable';
import { HemBoard, HemPiece } from './types';

const TILES = [
  ['waiting', 'Pieces waiting', 'border-amber-200 bg-amber-50 text-amber-700'],
  ['onTable', 'On the machine', 'border-sky-100 bg-sky-50 text-sky-700'],
  ['doneToday', 'Hem done today', 'border-purple-100 bg-purple-50 text-purple-700'],
  ['onRack', 'Back on a rack', 'border-emerald-100 bg-emerald-50 text-emerald-700'],
] as const;

const EMPTY_COUNTS = { waiting: 0, onTable: 0, doneToday: 0, onRack: 0 };

/**
 * Vertical hemming console. Half-moon pieces are hemmed, thread is recorded, then they go back on a rack.
 */
export default function VerticalHemmingPage() {
  const [board, setBoard] = useState<HemBoard>({ results: [], active: [], counts: EMPTY_COUNTS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<HemPiece | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await factoryRequest<HemBoard>('/production/vertical-hem/upcoming');
      setBoard({
        results: data.results || [],
        active: data.active || [],
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
   */
  const openScanned = (code: string) => {
    const needle = code.trim().toLowerCase();
    const match = [...board.results, ...board.active].find((row) => row.barcode.toLowerCase() === needle);
    if (!match) {
      setError('This piece is not on a rack for vertical hemming');
      return;
    }
    setJob(match);
    setError('');
  };

  return (
    <RequireCrudPermission path="Production / Vertical hemming" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Vertical hemming" />
        <div className="relative border border-gray-100 bg-white shadow-sm">
          <div className="p-[10px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-[3px] rounded-full bg-purple-600" />
                <h1 className="text-sm font-bold text-gray-800">Vertical hemming</h1>
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
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Vertical hemming counts">
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
              <label className="text-[11px] font-bold text-[#495057]" htmlFor="hemScan">
                Piece barcode
              </label>
              <input
                id="hemScan"
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
              <HemPieceTable pieces={board.results} active={board.active} onOpen={setJob} />
            )}
          </div>
        </div>
        <HemJobDrawer piece={job} waiting={board.results} onClose={() => setJob(null)} onChanged={load} />
      </div>
    </RequireCrudPermission>
  );
}
