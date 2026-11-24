'use client';

import React, { useMemo, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import WhmPickBatchTable from './components/WhmPickBatchTable';
import { MOCK_PICK_BATCHES, type WhmPickBatchStatus } from './mockPickBatches';

type PickPackTab = 'active' | 'history';

export default function WhmPickPackPage() {
  const [tab, setTab] = useState<PickPackTab>('active');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | WhmPickBatchStatus>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MOCK_PICK_BATCHES.filter((batch) => {
      if (batch.active !== (tab === 'active')) return false;
      if (tab === 'history' && statusFilter && batch.status !== statusFilter) return false;
      if (!needle) return true;
      const blob = [batch.batchNumber, ...batch.orderNumbers, ...batch.motherWhRefs].join(' ').toLowerCase();
      return blob.includes(needle);
    });
  }, [tab, q, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageRows = filtered.slice((page - 1) * limit, page * limit);

  const handleTabChange = (next: PickPackTab) => {
    setTab(next);
    setPage(1);
    if (next === 'active') setStatusFilter('');
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Pick & Pack" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
          <h1 className="text-2xl font-semibold text-gray-800">Pick & Pack</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search batch # or order…"
                className="border border-gray-200 rounded pl-8 pr-3 py-1.5 text-sm min-w-[180px] focus:ring-1 focus:ring-purple-300 focus:border-purple-400"
                aria-label="Search pick lists"
              />
            </div>
            {tab === 'history' ? (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as '' | WhmPickBatchStatus);
                  setPage(1);
                }}
                className="border border-gray-200 rounded px-3 py-1.5 text-sm"
                aria-label="Filter history by status"
              >
                <option value="">All completed</option>
                <option value="picking">Fully picked</option>
                <option value="sent-to-scanning">Sent to scanning</option>
                <option value="cancelled">Cancelled</option>
              </select>
            ) : null}
          </div>
        </div>

        <div className="p-[10px]">
          <div className="flex gap-2 mb-4 border-b border-gray-100 pb-2" role="tablist" aria-label="Pick list views">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'active'}
              onClick={() => handleTabChange('active')}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded ${
                tab === 'active' ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'history'}
              onClick={() => handleTabChange('history')}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded ${
                tab === 'history' ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              History
            </button>
          </div>

          <WhmPickBatchTable batches={pageRows} variant={tab} />

          {totalPages > 1 ? (
            <div className="flex justify-center gap-2 mt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm font-medium disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500 py-1">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}