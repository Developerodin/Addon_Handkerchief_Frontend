'use client';

import React, { useMemo, useState } from 'react';
import WhmInwardReceivedTable from './WhmInwardReceivedTable';
import { DEMO_INWARD_TOTAL, MOCK_INWARD_ROWS } from '../mockInwardReceived';

type SourceFilter = 'all' | 'factory' | 'qc_hold';
type SortKey = 'receivedAtDesc' | 'receivedAtAsc';

export default function WhmInwardReceivedPanel() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sort, setSort] = useState<SortKey>('receivedAtDesc');
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = MOCK_INWARD_ROWS.filter((r) => {
      if (sourceFilter === 'factory' && r.source !== 'FACTORY') return false;
      if (sourceFilter === 'qc_hold' && r.source !== 'QC_HOLD') return false;
      if (!q) return true;
      const blob = [r.productCode, r.sortNo, r.styleCode, r.design, r.source].join(' ').toLowerCase();
      return blob.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const ta = new Date(a.receivedAt).getTime();
      const tb = new Date(b.receivedAt).getTime();
      return sort === 'receivedAtDesc' ? tb - ta : ta - tb;
    });
    return rows;
  }, [search, sourceFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageRows = filtered.slice((page - 1) * limit, page * limit);

  return (
  <>
      <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300 bg-white">
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
        >
          <i className="ri-barcode-line text-xs" aria-hidden />
          Receive from factory
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50"
        >
          <i className="ri-refresh-line text-xs" aria-hidden />
          Refresh
        </button>
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Product, sort no, style…"
            className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded w-full placeholder:text-gray-500 focus:ring-1 focus:ring-teal-400 focus:border-teal-500"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value as SourceFilter);
            setPage(1);
          }}
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
        >
          <option value="all">All sources</option>
          <option value="factory">Factory FG</option>
          <option value="qc_hold">QC hold</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
        >
          <option value="receivedAtDesc">Received date, newest</option>
          <option value="receivedAtAsc">Received date, oldest</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <span className="text-[11px] font-medium text-gray-600 ml-auto">
          {DEMO_INWARD_TOTAL} rows
        </span>
      </div>

      <div className="border border-gray-300 border-t-0 rounded-b overflow-hidden bg-white">
        <WhmInwardReceivedTable rows={pageRows} />
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-2 border-t border-gray-200">
          <span className="text-[10px] text-gray-400">
            Page {page} of {totalPages} · showing {pageRows.length} of {filtered.length} in demo set
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 text-[11px] font-bold text-gray-500 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 text-[11px] font-bold text-gray-500 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}