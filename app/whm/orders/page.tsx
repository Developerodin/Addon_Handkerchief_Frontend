'use client';

import React, { useMemo, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import WhmWarehouseOrdersTable from './components/WhmWarehouseOrdersTable';
import {
  MOCK_WAREHOUSE_ORDERS,
  type WhmOrderStatus,
  type WhmWarehouseOrder,
} from './mockWarehouseOrders';

const STATUS_TABS: Array<{ id: 'all' | WhmOrderStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In-Progress' },
  { id: 'packed', label: 'Packed' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'cancelled', label: 'Cancelled' },
];

const CLIENT_TYPES = ['', 'Holding', 'Replenishment', 'Urgent'] as const;

/** Demo total count shown in header (full list not loaded in static UI). */
const DEMO_TOTAL_RESULTS = 57;

const STATS_FROM_DEMO = {
  draft: 1,
  pending: 5,
  'in-progress': 13,
  packed: 1,
  dispatched: 0,
  cancelled: 0,
};

function matchesFilters(
  row: WhmWarehouseOrder,
  opts: {
    statusTab: 'all' | WhmOrderStatus;
    clientType: string;
    q: string;
    motherWhOnly: boolean;
    dateFrom: string;
    dateTo: string;
  }
) {
  if (opts.statusTab !== 'all' && row.status !== opts.statusTab) return false;
  if (opts.clientType && row.clientType !== opts.clientType) return false;
  if (opts.motherWhOnly && !row.fromMotherWh) return false;
  const day = row.createdAt.slice(0, 10);
  if (opts.dateFrom && day < opts.dateFrom) return false;
  if (opts.dateTo && day > opts.dateTo) return false;
  const needle = opts.q.trim().toLowerCase();
  if (!needle) return true;
  return (
    row.orderNumber.toLowerCase().includes(needle) ||
    row.clientName.toLowerCase().includes(needle) ||
    row.motherWhRef.toLowerCase().includes(needle)
  );
}

export default function WhmOrdersPage() {
  const [statusTab, setStatusTab] = useState<'all' | WhmOrderStatus>('all');
  const [clientType, setClientType] = useState('');
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(20);
  const [motherWhOnly, setMotherWhOnly] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      MOCK_WAREHOUSE_ORDERS.filter((row) =>
        matchesFilters(row, { statusTab, clientType, q, motherWhOnly, dateFrom, dateTo })
      ),
    [statusTab, clientType, q, motherWhOnly, dateFrom, dateTo]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageRows = filtered.slice((page - 1) * limit, page * limit);

  const selectedCount = selectedOrderIds.size;

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Dispatch orders" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Dispatch orders</h1>
              <span className="text-[10px] text-gray-400 font-medium hidden md:inline">Ship to Addon Holding Mumbai</span>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {DEMO_TOTAL_RESULTS}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-52 min-w-[140px] placeholder:text-gray-400 font-medium"
                  placeholder="Search WO / mother WH ref…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
              <div className="relative">
                <select
                  value={clientType}
                  onChange={(e) => {
                    setClientType(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer min-w-[130px]"
                  aria-label="Filter by order type"
                >
                  <option value="">All order types</option>
                  {CLIENT_TYPES.filter(Boolean).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
              <input
                type="date"
                className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 font-medium"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 font-medium"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value={20}>Show 20</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMotherWhOnly((v) => !v);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors shadow-sm ${
                  motherWhOnly
                    ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                aria-pressed={motherWhOnly}
              >
                <i className="ri-building-4-line text-xs" aria-hidden />
                From Mother WH
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-[11px] font-bold rounded hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <i className="ri-list-check-2 text-xs" aria-hidden />
                {selectedCount > 1
                  ? `Combine & Pick List (${selectedCount})`
                  : selectedCount === 1
                    ? 'Generate Pick List'
                    : 'Generate Pick List'}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-download-2-line text-xs" aria-hidden />
                Template
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-store-2-line text-xs" aria-hidden />
                Store Template
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <i className="ri-file-excel-2-line text-xs" aria-hidden />
                Bulk Import
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" aria-hidden />
                Add order
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4" aria-label="Order counts">
            <motionlessStat label="Draft" value={STATS_FROM_DEMO.draft} tone="amber" />
            <motionlessStat label="Pending" value={STATS_FROM_DEMO.pending} tone="sky" />
            <motionlessStat label="In-Prog" value={STATS_FROM_DEMO['in-progress']} tone="violet" />
            <motionlessStat label="Packed" value={STATS_FROM_DEMO.packed} tone="emerald" />
            <motionlessStat label="Dispatch" value={STATS_FROM_DEMO.dispatched} tone="teal" />
            <motionlessStat label="Cancelled" value={STATS_FROM_DEMO.cancelled} tone="red" />
          </div>

          <div className="flex flex-wrap border-b border-gray-200 mt-4 -mb-px" role="tablist" aria-label="Order status">
            {STATUS_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={statusTab === id}
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  statusTab === id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => {
                  setStatusTab(id);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <WhmWarehouseOrdersTable
            rows={pageRows}
            selectedIds={selectedOrderIds}
            onSelectionChange={setSelectedOrderIds}
          />
        </div>

        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <p className="text-[11px] font-medium text-[#495057] tracking-tight">
            Page <span>{page}</span> of <span>{totalPages}</span> <span className="ml-1 opacity-50">→</span>
            <span className="ml-2 text-[10px] text-gray-400">(static demo · {filtered.length} sample rows)</span>
          </p>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function motionlessStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'sky' | 'violet' | 'emerald' | 'teal' | 'red';
}) {
  const tones = {
    amber: {
      box: 'bg-amber-50 border-amber-100',
      label: 'text-amber-800',
      value: 'text-amber-950',
    },
    sky: {
      box: 'bg-sky-50 border-sky-100',
      label: 'text-sky-800',
      value: 'text-sky-950',
    },
    violet: {
      box: 'bg-violet-50 border-violet-100',
      label: 'text-violet-800',
      value: 'text-violet-950',
    },
    emerald: {
      box: 'bg-emerald-50 border-emerald-100',
      label: 'text-emerald-800',
      value: 'text-emerald-950',
    },
    teal: {
      box: 'bg-teal-50 border-teal-100',
      label: 'text-teal-800',
      value: 'text-teal-950',
    },
    red: {
      box: 'bg-red-50 border-red-100',
      label: 'text-red-700',
      value: 'text-red-900',
    },
  };
  const t = tones[tone];
  return (
    <div className={`${t.box} border rounded p-2 flex items-center justify-between`}>
      <span className={`text-[10px] font-bold ${t.label} uppercase tracking-wide`}>{label}</span>
      <span className={`text-sm font-bold ${t.value}`}>{value}</span>
    </div>
  );
}