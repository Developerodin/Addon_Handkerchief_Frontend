'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { factoryRequest } from '@/shared/services/factoryApi';
import { InlineCheckCompletedPanel } from './InlineCheckBundleTable';
import { InlineCheckJobDrawer } from './InlineCheckJobDrawer';
import { InlineCheckBoard, InlineCheckBundle, InlineCheckMachine } from './types';

const TILES = [
  ['doneToday', 'Logged today', 'border-purple-100 bg-purple-50 text-purple-700'],
  ['completed', 'Completed (recent)', 'border-emerald-100 bg-emerald-50 text-emerald-700'],
] as const;

const EMPTY_COUNTS = { doneToday: 0, completed: 0 };

/**
 * Inline checking after horizontal hemming. Pick a hemming machine, scan a bundle, confirm, place on rack.
 */
export default function InlineCheckPage() {
  const [board, setBoard] = useState<InlineCheckBoard>({ results: [], active: [], counts: EMPTY_COUNTS });
  const [machines, setMachines] = useState<InlineCheckMachine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<InlineCheckMachine | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<InlineCheckBundle | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [data, machineData] = await Promise.all([
        factoryRequest<InlineCheckBoard>('/production/inline-check/upcoming'),
        factoryRequest<{ results: InlineCheckMachine[] }>('/production/inline-check/machines'),
      ]);
      setBoard({
        results: [],
        active: [],
        completed: data.completed || [],
        counts: {
          ...EMPTY_COUNTS,
          doneToday: data.counts?.doneToday ?? 0,
          completed: data.counts?.completed ?? (data.completed?.length || 0),
        },
      });
      setMachines(machineData.results || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inline checking');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const refreshBoard = useCallback(() => load({ silent: true }), [load]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const openScanned = async (code: string) => {
    if (!selectedMachine) {
      setError('Select a horizontal hemming machine first');
      return;
    }
    const trimmed = code.trim();
    if (!trimmed) return;
    setScanLoading(true);
    setError('');
    try {
      const data = await factoryRequest<{ bundle: InlineCheckBundle; alreadyLogged: boolean }>(
        `/production/inline-check/lookup?barcode=${encodeURIComponent(trimmed)}&hemMachineBarcode=${encodeURIComponent(selectedMachine.barcode)}`
      );
      if (data.alreadyLogged) {
        setError('Inline checking is already logged for this bundle on this machine. See Completed below.');
        setJob(null);
        return;
      }
      setJob(data.bundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This bundle cannot be inline checked. Scan a hemmed bundle that has not gone to thread cutting yet.');
      setJob(null);
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <RequireCrudPermission path="Production / Inline checking" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Inline checking" />
        <div className="relative border border-gray-100 bg-white shadow-sm">
          <div className="p-[10px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-[3px] rounded-full bg-purple-600" />
                <h1 className="text-sm font-bold text-gray-800">Inline checking</h1>
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

            <div className="mb-4 grid grid-cols-2 gap-2" aria-label="Inline checking counts">
              {TILES.map(([key, label, tone]) => (
                <div key={key} className={`rounded border px-3 py-2 ${tone}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-gray-900">{board.counts[key as keyof typeof EMPTY_COUNTS] ?? 0}</p>
                </div>
              ))}
            </div>

            <section className="mb-4" aria-label="Horizontal hemming machines">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Horizontal hemming machines</p>
              {machines.length ? (
                <div className="flex flex-wrap gap-2">
                  {machines.map((machine) => {
                    const active = selectedMachine?.barcode === machine.barcode;
                    return (
                      <button
                        key={machine.barcode}
                        type="button"
                        className={
                          active
                            ? 'rounded border border-purple-400 bg-purple-50 px-3 py-2 text-left shadow-sm'
                            : 'rounded border border-gray-200 bg-white px-3 py-2 text-left hover:bg-gray-50'
                        }
                        onClick={() => {
                          setSelectedMachine(machine);
                          setError('');
                        }}
                      >
                        <span className="block text-[11px] font-bold text-gray-900">{machine.name || machine.code}</span>
                        <span className="font-mono text-[10px] text-gray-600">{machine.barcode}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-gray-600">No active horizontal hemming machines in catalog.</p>
              )}
              <p className="mt-2 text-[11px] text-gray-500">
                Tracking only — scan a hemmed bundle barcode below. It does not block thread cutting.
              </p>
            </section>

            <form
              className="mb-4 flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                openScanned(scan).catch(() => undefined);
                setScan('');
              }}
            >
              <label className="text-[11px] font-bold text-[#495057]" htmlFor="ilcScan">
                Bundle barcode
              </label>
              <input
                id="ilcScan"
                aria-label="Bundle barcode"
                className="w-48 min-w-[120px] rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] placeholder:text-gray-400 focus:border-purple-300 focus:ring-0"
                value={scan}
                autoComplete="off"
                placeholder={selectedMachine ? 'Scan bundle' : 'Select a machine first'}
                onChange={(event) => setScan(event.target.value)}
                disabled={!selectedMachine || scanLoading}
                required
              />
              <button
                type="submit"
                className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
                disabled={!selectedMachine || scanLoading}
              >
                {scanLoading ? '…' : 'Open'}
              </button>
            </form>

            {error ? (
              <p className="mb-3 text-[12px] text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            {loading ? (
              <div className="flex flex-col items-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600 opacity-50" />
              </div>
            ) : (
              <InlineCheckCompletedPanel completed={board.completed} />
            )}
          </div>
        </div>
        {job && selectedMachine ? (
          <InlineCheckJobDrawer bundle={job} hemMachine={selectedMachine} onClose={() => setJob(null)} onChanged={refreshBoard} />
        ) : null}
      </div>
    </RequireCrudPermission>
  );
}