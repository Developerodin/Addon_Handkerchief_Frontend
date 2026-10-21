'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { factoryRequest } from '@/shared/services/factoryApi';

interface StoredRoll {
  barcode: string;
  rollCode: string;
  fabricName: string;
  colourName: string;
  lotNumber: string;
  grossWeight: number;
  netWeight: number;
  poNumber: string;
  rackCode: string;
  floor: string;
  section: string;
}

type ReportView = 'menu' | 'summary' | 'full';

export interface RackReportDrawerProps {
  onClose: () => void;
}

/**
 * Report menu for rolls currently stored on racks.
 */
export function RackReportDrawer({ onClose }: RackReportDrawerProps) {
  const [rolls, setRolls] = useState<StoredRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ReportView>('menu');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    /**
     * Loads every roll that is sitting on a rack.
     */
    const load = async () => {
      try {
        const data = await factoryRequest<{ results: StoredRoll[] }>('/store/storage-report');
        if (!cancelled) setRolls(data.results || []);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Could not load the report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fabricTypes = useMemo(() => new Set(rolls.map((roll) => roll.fabricName || 'Unknown')).size, [rolls]);
  const gross = rolls.reduce((sum, roll) => sum + (Number(roll.grossWeight) || 0), 0);
  const net = rolls.reduce((sum, roll) => sum + (Number(roll.netWeight) || 0), 0);
  const filtered = useMemo(() => filterRolls(rolls, search), [rolls, search]);
  const hasData = rolls.length > 0;

  /**
   * Downloads one sheet of stored rolls with rack, weights, and PO.
   */
  const downloadExcel = () => {
    if (!rolls.length) {
      toast.error('No rolls to export');
      return;
    }
    try {
      const rows = rolls.map((roll) => ({
        'Roll ID': roll.rollCode || roll.barcode,
        Barcode: roll.barcode,
        'PO Number': roll.poNumber || '',
        Fabric: roll.fabricName || '',
        Colour: roll.colourName || '',
        Lot: roll.lotNumber || '',
        Rack: roll.rackCode,
        Floor: roll.floor || '',
        Section: roll.section || '',
        'Gross weight (kg)': roll.grossWeight,
        'Net weight (kg)': roll.netWeight,
      }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Rolls');
      XLSX.writeFile(book, `rolls-storage-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download Excel');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close report" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="rack-report-title" className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <h2 id="rack-report-title" className="text-base font-bold text-gray-800">Report — Rolls storage</h2>
          <button type="button" className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close" onClick={onClose}>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <p className="py-12 text-center text-sm text-gray-500">Loading rolls…</p> : null}
          {!loading && view === 'menu' ? (
            <div className="space-y-3">
              <MenuButton icon="ri-file-excel-2-line text-emerald-600" title="Download Excel" hint="Export rolls with rack, gross & net weight, PO" disabled={!hasData} onClick={downloadExcel} />
              <MenuButton icon="ri-pie-chart-line text-primary" title="View Summary" hint="Totals, roll gross and net weight, fabric types" disabled={!hasData} onClick={() => setView('summary')} />
              <MenuButton icon="ri-file-text-line text-gray-600" title="View Full Report" hint="All rolls with rack, weight, PO" disabled={!hasData} onClick={() => setView('full')} />
              {!hasData ? <p className="text-xs text-gray-500">No rolls stored on racks.</p> : null}
            </div>
          ) : null}
          {!loading && view === 'summary' ? (
            <div className="space-y-4">
              <BackButton onClick={() => setView('menu')} />
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-800">Storage summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Total rolls" value={String(rolls.length)} />
                  <Stat label="Fabric types" value={String(fabricTypes)} />
                  <Stat label="Total roll gross (kg)" value={gross.toFixed(2)} />
                  <Stat label="Total roll net (kg)" value={net.toFixed(2)} />
                </div>
              </div>
            </div>
          ) : null}
          {!loading && view === 'full' ? (
            <div className="space-y-3">
              <BackButton onClick={() => setView('menu')} />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Search report</span>
                <input
                  type="search"
                  value={search}
                  aria-label="Search report"
                  placeholder="Roll, PO, fabric, rack…"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              {filtered.length === 0 ? <p className="text-sm text-gray-500">No rolls match.</p> : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      {['Roll', 'PO', 'Fabric', 'Rack', 'Gross', 'Net'].map((label) => <th key={label} scope="col" className="px-2 py-2">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((roll) => (
                      <tr key={roll.barcode} className="border-b border-gray-100">
                        <td className="px-2 py-2 font-semibold">{roll.rollCode || roll.barcode}</td>
                        <td className="px-2 py-2">{roll.poNumber || '—'}</td>
                        <td className="px-2 py-2">{roll.fabricName || '—'}</td>
                        <td className="px-2 py-2">{roll.rackCode}</td>
                        <td className="px-2 py-2">{Number(roll.grossWeight).toFixed(2)}</td>
                        <td className="px-2 py-2">{Number(roll.netWeight).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

/**
 * One action row on the report menu.
 */
function MenuButton({ icon, title, hint, disabled, onClick }: { icon: string; title: string; hint: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={onClick}>
      <i className={`${icon} text-2xl`} aria-hidden />
      <span>
        <span className="block font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </button>
  );
}

/**
 * Returns to the report menu.
 */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="flex items-center gap-1 text-sm text-primary hover:underline" onClick={onClick}>
      <i className="ri-arrow-left-line" aria-hidden /> Back
    </button>
  );
}

/**
 * One summary figure.
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

/**
 * Matches roll id, barcode, PO, fabric, colour, or rack.
 */
function filterRolls(rolls: StoredRoll[], query: string): StoredRoll[] {
  const text = query.trim().toLowerCase();
  if (!text) return rolls;
  return rolls.filter((roll) => [roll.rollCode, roll.barcode, roll.poNumber, roll.fabricName, roll.colourName, roll.rackCode]
    .some((value) => (value || '').toLowerCase().includes(text)));
}
