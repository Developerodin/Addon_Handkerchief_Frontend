'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { factoryRequest, RollRow } from '@/shared/services/factoryApi';
import { RackDetailsDrawer, RackMove, StorageRackCard } from './RackDetailsDrawer';
import { RackFilterPanel } from './RackFilterPanel';
import { AddRacksDrawer } from './AddRacksDrawer';
import { PlaceRollDrawer } from './PlaceRollDrawer';
import { RackReportDrawer } from './RackReportDrawer';
import { A4BarcodePreview, A4PreviewLabel } from '@/shared/components/print/A4BarcodePreview';
import { downloadRacksExcel } from './rackBarcode';

const PAGE_SIZE = 24;
const outline = 'inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50';

/**
 * Rolls storage: scan a roll onto a rack barcode, filter the grid, and open a rack.
 */
export function RackLayout() {
  const [racks, setRacks] = useState<StorageRackCard[]>([]);
  const [query, setQuery] = useState('');
  const [fabric, setFabric] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [section, setSection] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [scan, setScan] = useState('');
  const [scanning, setScanning] = useState(false);
  const [placing, setPlacing] = useState<RollRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [barcodePreview, setBarcodePreview] = useState<A4PreviewLabel[] | null>(null);
  const [active, setActive] = useState<StorageRackCard | null>(null);
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [history, setHistory] = useState<RackMove[]>([]);
  const [loadingRack, setLoadingRack] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const data = await factoryRequest<{ results: StorageRackCard[] }>('/store/rack-board');
    setRacks(data.results || []);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load racks'));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, fabric, occupancy, section]);

  const sections = useMemo(
    () => [...new Set(racks.map((rack) => rack.zone).filter(Boolean))].sort(),
    [racks],
  );
  const floors = useMemo(
    () => [...new Set(racks.map((rack) => rack.floor).filter(Boolean))].sort(),
    [racks],
  );

  const filtered = useMemo(() => filterRacks(racks, { query, fabric, occupancy, section }), [racks, query, fabric, occupancy, section]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  /**
   * Looks up the scanned roll and asks which rack barcode it should sit on.
   */
  const confirmScan = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = scan.trim();
    if (!code) return;
    setScanning(true);
    setError('');
    try {
      const data = await factoryRequest<{ roll: RollRow }>(`/store/rolls/track/${encodeURIComponent(code)}`);
      setPlacing(data.roll);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Roll not found');
    } finally {
      setScanning(false);
    }
  };

  /**
   * Opens the drawer and loads rolls plus move history for this rack.
   */
  const openRack = async (rack: StorageRackCard) => {
    setActive(rack);
    setLoadingRack(true);
    setError('');
    try {
      const data = await factoryRequest<{ results: RollRow[]; history?: RackMove[] }>(`/store/racks/${encodeURIComponent(rack.code)}`);
      setRolls(data.results || []);
      setHistory(data.history || []);
    } catch (err) {
      setRolls([]);
      setHistory([]);
      setError(err instanceof Error ? err.message : 'Could not load this rack');
    } finally {
      setLoadingRack(false);
    }
  };

  /**
   * Downloads the filtered racks. Empty filters still cover the full list.
   */
  const downloadExcel = () => {
    if (!filtered.length) {
      toast.error('No racks to export');
      return;
    }
    try {
      downloadRacksExcel(filtered);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export racks');
    }
  };

  /**
   * Opens the A4 preview for the racks currently in the list.
   */
  const openBarcodePreview = () => {
    if (!filtered.length) {
      toast.error('No racks to print');
      return;
    }
    setBarcodePreview(filtered.map(rackPreviewLabel));
  };

  return (
    <div className="space-y-4">
      <form className="space-y-1" onSubmit={confirmScan}>
        <label htmlFor="scan-roll" className="block text-xs font-medium text-gray-700">Scan roll barcode</label>
        <div className="flex gap-2">
          <span className="relative min-w-0 flex-1">
            <i className="ri-barcode-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              id="scan-roll"
              value={scan}
              placeholder="Scan QC-passed roll barcode"
              aria-label="Scan roll barcode"
              className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(event) => setScan(event.target.value)}
            />
          </span>
          <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-primary px-4 text-xs font-bold text-white disabled:opacity-50" disabled={scanning}>
            <i className="ri-check-line" aria-hidden />
            {scanning ? 'Checking…' : 'Confirm'}
          </button>
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Search rack</span>
        <input
          type="search"
          value={query}
          placeholder="Rack code or barcode"
          aria-label="Search rack"
          className="w-44 rounded-md border border-gray-200 px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className={outline} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
          <i className="ri-filter-3-line" aria-hidden /> Filters
        </button>
        <button type="button" className={outline} onClick={() => setAddOpen(true)}>
          <i className="ri-add-line" aria-hidden /> Add racks
        </button>
        <button type="button" className={outline} onClick={downloadExcel}>
          <i className="ri-file-excel-2-line text-emerald-600" aria-hidden /> Download Excel
        </button>
        <button type="button" className={outline} onClick={() => setReportOpen(true)}>
          <i className="ri-file-list-3-line text-primary" aria-hidden /> Report
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white" aria-label="Preview rack barcodes on A4" onClick={openBarcodePreview}>
          <i className="ri-barcode-line" aria-hidden /> Print barcode
        </button>
      </div>
      {filtersOpen ? (
        <RackFilterPanel
          fabric={fabric}
          occupancy={occupancy}
          section={section}
          sections={sections}
          onFabricChange={setFabric}
          onOccupancyChange={setOccupancy}
          onSectionChange={setSection}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
      {error && !active ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <p>Showing {filtered.length ? start + 1 : 0}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} racks</p>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>
          <span className="px-1">{safePage} / {pageCount}</span>
          <button type="button" className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40" aria-label="Next page" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>›</button>
        </div>
      </div>
      {visible.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">No racks match.</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((rack) => (
          <button
            key={rack.code}
            type="button"
            aria-label={`Open rack ${rack.code}`}
            className={`rounded-lg border px-3 py-4 text-center text-sm font-medium transition-colors ${rack.count ? 'border-emerald-300 bg-emerald-100 text-emerald-950 hover:border-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300'}`}
            onClick={() => openRack(rack)}
          >
            {rack.code}
          </button>
        ))}
      </div>
      {active ? (
        <RackDetailsDrawer rack={active} rolls={rolls} history={history} loading={loadingRack} error={error} onClose={() => setActive(null)} />
      ) : null}
      {placing ? (
        <PlaceRollDrawer
          roll={placing}
          onClose={() => setPlacing(null)}
          onPlaced={(rackCode, alreadyThere) => {
            toast.success(alreadyThere ? `Already on ${rackCode}` : `Stored on ${rackCode}`);
            setPlacing(null);
            setScan('');
            load().catch((err) => setError(err instanceof Error ? err.message : 'Could not refresh racks'));
          }}
        />
      ) : null}
      {addOpen ? (
        <AddRacksDrawer
          sections={sections}
          floors={floors}
          onClose={() => setAddOpen(false)}
          onCreated={(count) => {
            toast.success(`Added ${count} rack${count === 1 ? '' : 's'}`);
            setAddOpen(false);
            load().catch((err) => setError(err instanceof Error ? err.message : 'Could not refresh racks'));
          }}
        />
      ) : null}
      {reportOpen ? <RackReportDrawer onClose={() => setReportOpen(false)} /> : null}
      {barcodePreview ? <A4BarcodePreview labels={barcodePreview} onClose={() => setBarcodePreview(null)} /> : null}
    </div>
  );
}

/**
 * Rack sticker for the A4 preview. The barcode is the rack barcode, or the rack code when none is set.
 */
function rackPreviewLabel(rack: StorageRackCard): A4PreviewLabel {
  const barcode = rack.barcode || rack.code;
  const subtitle = [rack.name && rack.name !== rack.code ? rack.name : '', rack.zone, rack.floor].filter(Boolean).join(' · ');
  return { id: rack.code, name: rack.code, detail: barcode, title: rack.code, subtitle, barcode };
}

/**
 * Keeps racks that match the search box and the open filter panel.
 */
function filterRacks(
  racks: StorageRackCard[],
  filters: { query: string; fabric: string; occupancy: string; section: string },
): StorageRackCard[] {
  const code = filters.query.trim().toLowerCase();
  const fabric = filters.fabric.trim().toLowerCase();
  return racks.filter((rack) => {
    if (filters.occupancy === 'empty' && rack.count) return false;
    if (filters.occupancy === 'occupied' && !rack.count) return false;
    if (filters.section && rack.zone !== filters.section) return false;
    if (fabric && !(rack.fabrics || []).some((name) => name.toLowerCase().includes(fabric))) return false;
    if (!code) return true;
    return rack.code.toLowerCase().includes(code) || (rack.barcode || '').toLowerCase().includes(code) || (rack.name || '').toLowerCase().includes(code);
  });
}
