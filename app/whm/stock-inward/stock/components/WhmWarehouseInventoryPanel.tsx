'use client';

import React, { useMemo, useState } from 'react';
import WhmWarehouseInventoryTable from './WhmWarehouseInventoryTable';
import { DEMO_STOCK_TOTAL, MOCK_WAREHOUSE_STOCK } from '../mockWarehouseStock';

type SortKey = 'createdAt:desc' | 'createdAt:asc' | 'updatedAt:desc' | 'updatedAt:asc';

export default function WhmWarehouseInventoryPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('createdAt:desc');
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    let rows = MOCK_WAREHOUSE_STOCK.filter((r) => {
      if (!q) return true;
      return (
        r.style.toLowerCase().includes(q) ||
        r.sortNo.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.design.toLowerCase().includes(q)
      );
    });
    rows = [...rows].sort((a, b) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      if (sortBy === 'updatedAt:asc' || sortBy === 'createdAt:asc') return ta - tb;
      return tb - ta;
    });
    return rows;
  }, [searchInput, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageRows = filtered.slice((page - 1) * limit, page * limit);

  return (
    <>
      <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300 bg-white">
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
        >
          <i className="ri-add-line text-xs" aria-hidden />
          Add inventory
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50"
        >
          <i className="ri-file-download-line text-xs" aria-hidden />
          Download template
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50"
        >
          <i className="ri-upload-2-line text-xs" aria-hidden />
          Import
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-[11px] font-bold rounded hover:bg-sky-700 shadow-sm"
        >
          <i className="ri-file-download-line text-xs" aria-hidden />
          Export
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
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Product, sort no, style…"
            className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded w-full placeholder:text-gray-500 focus:ring-1 focus:ring-teal-400 focus:border-teal-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortKey);
            setPage(1);
          }}
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 max-w-[160px]"
        >
          <option value="createdAt:desc">Newest</option>
          <option value="createdAt:asc">Oldest</option>
          <option value="updatedAt:desc">Updated ↓</option>
          <option value="updatedAt:asc">Updated ↑</option>
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
        <span className="text-[11px] font-medium text-gray-600 ml-auto">{DEMO_STOCK_TOTAL} rows</span>
      </div>

      <div className="border border-gray-300 border-t-0 rounded-b overflow-hidden bg-white">
        <WhmWarehouseInventoryTable rows={pageRows} />
        <div className="p-3 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50">
          <div className="text-[11px] font-medium text-[#495057]">
            Page {page} of {totalPages} · API total {DEMO_STOCK_TOTAL.toLocaleString()}
            <span className="ml-2 text-[10px] text-gray-400">(static demo · {filtered.length} sample rows)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded border border-gray-200"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded border border-gray-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}