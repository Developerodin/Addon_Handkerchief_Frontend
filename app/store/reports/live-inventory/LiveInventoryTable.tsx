'use client';

import React from 'react';
import { formatQty } from '../ReportTable';
import { InventoryStatus, LiveInventoryRow, LiveInventorySort } from './liveInventory';

interface LiveInventoryTableProps {
  rows: LiveInventoryRow[];
  loading: boolean;
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  search: string;
  status: 'all' | InventoryStatus;
  sortBy: LiveInventorySort;
  sortOrder: 'asc' | 'desc';
  exporting: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: 'all' | InventoryStatus) => void;
  onLimitChange: (limit: number) => void;
  onPageChange: (page: number) => void;
  onSort: (field: LiveInventorySort) => void;
  onExport: () => void;
  onClear: () => void;
  onUnallocated: (row: LiveInventoryRow) => void;
}

const LIMITS = [10, 20, 50, 100];

const COLUMNS: { key: string; label: string; hint: string; sort?: LiveInventorySort }[] = [
  { key: 'fabricName', label: 'Fabric', hint: 'Catalog name', sort: 'fabricName' },
  { key: 'onRackMeters', label: 'On rack m', hint: 'Status stored', sort: 'onRackMeters' },
  { key: 'qcPassedMeters', label: 'QC passed m', hint: 'Not on a rack', sort: 'qcPassedMeters' },
  { key: 'unallocatedMeters', label: 'Unallocated m', hint: 'Received, not stored', sort: 'unallocatedMeters' },
  { key: 'rollCount', label: 'Rolls', hint: 'Stored + QC passed', sort: 'rollCount' },
  { key: 'issuedMeters', label: 'Issued m', hint: 'Issued + on floor', sort: 'issuedMeters' },
  { key: 'heldMeters', label: 'Held m', hint: 'Lot held' },
  { key: 'availableMeters', label: 'Available m', hint: 'On rack + QC passed', sort: 'availableMeters' },
  { key: 'status', label: 'Status', hint: 'Against minimum', sort: 'status' },
];

/**
 * Badge colour for the three stock states.
 * @param status - Row status from the report
 */
function statusClass(status: InventoryStatus): string {
  if (status === 'In Stock') return 'bg-green-100 text-green-800';
  if (status === 'Low Stock') return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

/**
 * Metres, with a muted zero so the stock columns scan quickly.
 * @param meters - Bucket total
 * @param tone - Colour when the number is above zero
 */
function metersCell(meters: number, tone: string): React.ReactNode {
  if (!meters) return <span className="text-gray-400">0</span>;
  return <span className={tone}>{formatQty(meters)}</span>;
}

/**
 * Filterable fabric inventory table. Sort and paging are applied by the API.
 */
export function LiveInventoryTable({
  rows,
  loading,
  page,
  limit,
  totalPages,
  totalResults,
  search,
  status,
  sortBy,
  sortOrder,
  exporting,
  onSearchChange,
  onStatusChange,
  onLimitChange,
  onPageChange,
  onSort,
  onExport,
  onClear,
  onUnallocated,
}: LiveInventoryTableProps) {
  const filtered = Boolean(search.trim()) || status !== 'all';
  const start = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);
  const head = 'px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200';

  return (
    <section className="overflow-hidden rounded-md border-2 border-gray-300 bg-white" aria-label="Live inventory" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
          Live inventory
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
              className="w-48 rounded border border-gray-300 py-1.5 pl-2 pr-7 text-xs font-medium text-gray-800"
            />
          </label>
          <label>
            <span className="sr-only">Stock status</span>
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value as 'all' | InventoryStatus)}
              aria-label="Stock status"
              className="rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-800"
            >
              <option value="all">All status</option>
              <option value="In Stock">In stock</option>
              <option value="Low Stock">Low stock</option>
              <option value="Out of Stock">Out of stock</option>
            </select>
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
          <button
            type="button"
            onClick={onExport}
            disabled={exporting || loading}
            aria-label="Export inventory as CSV"
            className="rounded bg-green-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" className={head} aria-sort={column.sort ? (sortBy === column.sort ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}>
                  {column.sort ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-left"
                      onClick={() => onSort(column.sort as LiveInventorySort)}
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
                  Loading inventory
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-sm text-gray-500">
                  {filtered ? 'No fabrics match these filters.' : 'No live fabric inventory.'}
                  {filtered ? (
                    <button type="button" onClick={onClear} className="ml-2 font-bold text-gray-800 underline">
                      Clear filters
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
                  <td className="px-2 py-2 text-xs tabular-nums text-gray-800">{formatQty(row.onRackMeters)}</td>
                  <td className="px-2 py-2 text-xs tabular-nums text-gray-800">{formatQty(row.qcPassedMeters)}</td>
                  <td className="px-2 py-2 text-xs tabular-nums">
                    {row.unallocatedMeters > 0 ? (
                      <button
                        type="button"
                        className="font-semibold text-violet-700 underline hover:text-violet-900"
                        onClick={() => onUnallocated(row)}
                        aria-label={`View unallocated rolls for ${row.fabricName}`}
                      >
                        {formatQty(row.unallocatedMeters)}
                      </button>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs tabular-nums text-gray-800">{formatQty(row.rollCount)}</td>
                  <td className="px-2 py-2 text-xs tabular-nums">{metersCell(row.issuedMeters, 'font-semibold text-orange-700')}</td>
                  <td className="px-2 py-2 text-xs tabular-nums text-gray-800">{formatQty(row.heldMeters)}</td>
                  <td className="px-2 py-2 text-xs font-semibold tabular-nums text-green-700">{formatQty(row.availableMeters)}</td>
                  <td className="px-2 py-2 text-right">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
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
        <nav className="flex items-center gap-2" aria-label="Inventory pages">
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
