import React from 'react';
import { formatQty } from '../ReportTable';
import { FabricAnalyticsRow, FabricAnalyticsSort, FabricRack } from './fabricAnalytics';

interface FabricAnalyticsTableProps {
  rows: FabricAnalyticsRow[];
  loading: boolean;
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  search: string;
  sortBy: FabricAnalyticsSort;
  sortOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onLimitChange: (limit: number) => void;
  onPageChange: (page: number) => void;
  onSort: (field: FabricAnalyticsSort) => void;
  onClear: () => void;
}

const LIMITS = [10, 20, 50, 100];

const COLUMNS: { key: string; label: string; hint: string; sort?: FabricAnalyticsSort }[] = [
  { key: 'fabricName', label: 'Fabric', hint: 'Catalog name', sort: 'fabricName' },
  { key: 'inventoryMeters', label: 'Inventory m', hint: 'In the store', sort: 'inventoryMeters' },
  { key: 'inOrderMeters', label: 'In order m', hint: 'Open POs still due', sort: 'inOrderMeters' },
  { key: 'draftMeters', label: 'Draft m', hint: 'Draft PO lines', sort: 'draftMeters' },
  { key: 'draftPoCount', label: 'Draft POs', hint: 'Distinct drafts', sort: 'draftPoCount' },
  { key: 'unallocatedMeters', label: 'Unallocated m', hint: 'Received, not stored', sort: 'unallocatedMeters' },
  { key: 'onRackMeters', label: 'On rack m', hint: 'Status stored', sort: 'onRackMeters' },
  { key: 'racks', label: 'Racks', hint: 'Where stored rolls sit' },
];

/**
 * Metres, with a muted zero so the quantity columns scan quickly.
 * @param meters - Bucket total
 */
function metersCell(meters: number): React.ReactNode {
  if (!meters) return <span className="text-gray-400">0</span>;
  return <span className="tabular-nums text-gray-800">{formatQty(meters)}</span>;
}

/**
 * Rack codes and the metres sitting on each one.
 * @param racks - Latest location of stored rolls
 */
function rackLabel(racks: FabricRack[]): string {
  return racks.map((rack) => `${rack.code} ${formatQty(rack.meters)}m`).join(', ');
}

/**
 * Filterable fabric analytics table. Sort and paging are applied by the API.
 */
export function FabricAnalyticsTable({
  rows,
  loading,
  page,
  limit,
  totalPages,
  totalResults,
  search,
  sortBy,
  sortOrder,
  onSearchChange,
  onLimitChange,
  onPageChange,
  onSort,
  onClear,
}: FabricAnalyticsTableProps) {
  const filtered = Boolean(search.trim());
  const start = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);
  const head = 'px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200';

  return (
    <section className="overflow-hidden rounded-md border-2 border-gray-300 bg-white" aria-label="Fabric analytics" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
          All fabrics
          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{formatQty(totalResults)}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search fabric</span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Fabric, colour, or sort"
              aria-label="Search fabric"
              className="w-52 rounded border border-gray-300 py-1.5 pl-2 pr-2 text-xs font-medium text-gray-800"
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
            Rows
            <select
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              aria-label="Rows per page"
              className="rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-800"
            >
              {LIMITS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={head}
                  aria-sort={column.sort ? (sortBy === column.sort ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                >
                  {column.sort ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-left"
                      onClick={() => onSort(column.sort as FabricAnalyticsSort)}
                      aria-label={`Sort by ${column.label}`}
                    >
                      <span>
                        {column.label}
                        <span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-gray-400">{column.hint}</span>
                      </span>
                      <span aria-hidden className="text-gray-400">
                        {sortBy === column.sort ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  ) : (
                    <span>
                      {column.label}
                      <span className="mt-0.5 block text-[9px] font-medium normal-case tracking-normal text-gray-400">{column.hint}</span>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-xs font-bold uppercase tracking-wide text-gray-400">
                  Loading fabric analytics
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-sm text-gray-500">
                  {filtered ? 'No fabrics match this search.' : 'No fabrics in the catalog.'}
                  {filtered ? (
                    <button type="button" onClick={onClear} className="ml-2 font-bold text-gray-800 underline">
                      Clear search
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.fabricId || row.fabricName} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-2">
                    <div className="text-xs font-bold text-gray-900">{row.fabricName}</div>
                    <div className="text-[10px] text-gray-500">
                      {[row.colourName, row.fabricSortNo].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs font-semibold">{metersCell(row.inventoryMeters)}</td>
                  <td className="px-2 py-2 text-xs">{metersCell(row.inOrderMeters)}</td>
                  <td className="px-2 py-2 text-xs">{metersCell(row.draftMeters)}</td>
                  <td className="px-2 py-2 text-xs">{metersCell(row.draftPoCount)}</td>
                  <td className="px-2 py-2 text-xs">{metersCell(row.unallocatedMeters)}</td>
                  <td className="px-2 py-2 text-xs">{metersCell(row.onRackMeters)}</td>
                  <td className="px-2 py-2 text-xs text-gray-800">
                    {row.racks.length ? (
                      <span className="tabular-nums" aria-label={`Racks for ${row.fabricName}: ${rackLabel(row.racks)}`}>
                        {rackLabel(row.racks)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2">
        <p className="text-[11px] text-gray-500">
          {start}–{end} of {formatQty(totalResults)}
        </p>
        <nav className="flex items-center gap-2" aria-label="Fabric pages">
          <button
            type="button"
            className="rounded border border-gray-300 px-2 py-1 text-[11px] font-bold text-gray-700 disabled:opacity-40"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <span className="text-[11px] font-medium text-gray-600">
            Page {page} of {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            className="rounded border border-gray-300 px-2 py-1 text-[11px] font-bold text-gray-700 disabled:opacity-40"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </nav>
      </div>
    </section>
  );
}
