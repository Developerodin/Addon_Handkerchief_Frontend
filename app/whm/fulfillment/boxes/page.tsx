'use client';

import React, { useMemo, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import WhmBoxesQueueTable from './components/WhmBoxesQueueTable';
import WhmBoxesHistoryTable from './components/WhmBoxesHistoryTable';
import { MOCK_BOX_HISTORY, MOCK_BOX_QUEUE } from './mockBoxesQueue';

type BoxesTab = 'active' | 'history';

const excelButtonClass =
  'inline-flex items-center gap-1.5 rounded border border-emerald-600/40 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed';

export default function WhmFulfillmentBoxesPage() {
  const [tab, setTab] = useState<BoxesTab>('active');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sourceRows = tab === 'active' ? MOCK_BOX_QUEUE : MOCK_BOX_HISTORY;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sourceRows;
    return sourceRows.filter((row) => {
      const blob =
        'orderNumber' in row
          ? [row.orderNumber, row.motherWhRef, 'clientName' in row ? row.clientName : ''].join(' ')
          : [row.orderNumber, row.motherWhRef, row.completedBy].join(' ');
      return blob.toLowerCase().includes(needle);
    });
  }, [sourceRows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageRows = filtered.slice((page - 1) * limit, page * limit);
  const pageIds = pageRows.map((r) => r.id);
  const allPageChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = (allChecked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => {
        if (allChecked) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const handleTabChange = (next: BoxesTab) => {
    setTab(next);
    setPage(1);
    setSelected(new Set());
  };

  const itemLabel = tab === 'active' ? 'orders' : 'sessions';

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Boxes" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Boxes</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">Scan packs, label cartons & master cartons for Mumbai dispatch</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded border border-gray-200 bg-white hover:bg-gray-50"
          >
            <i className="ri-refresh-line" aria-hidden />
            Refresh
          </button>
        </div>

        <div className="p-[10px]">
          <div className="flex gap-2 mb-4 border-b border-gray-100 pb-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'active'}
              onClick={() => handleTabChange('active')}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded ${
                tab === 'active' ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active Queue
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

          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[180px] max-w-xs">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search</label>
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search order #, client…"
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-[12px] focus:ring-1 focus:ring-purple-300 focus:border-purple-400"
              />
            </div>
            <div className="w-28">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Per page</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-[12px]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={selected.size === 0}
                className={excelButtonClass}
              >
                <i className="ri-file-excel-2-line text-sm" aria-hidden />
                Download selected{selected.size ? ` (${selected.size})` : ''}
              </button>
              <button type="button" disabled={filtered.length === 0} className={excelButtonClass}>
                <i className="ri-file-excel-2-line text-sm" aria-hidden />
                Download all
              </button>
            </div>
          </div>

          {tab === 'active' ? (
            <WhmBoxesQueueTable
              rows={pageRows as typeof MOCK_BOX_QUEUE}
              selected={selected}
              onToggle={toggleSelected}
              onTogglePage={togglePage}
              allPageChecked={allPageChecked}
            />
          ) : (
            <WhmBoxesHistoryTable
              rows={pageRows as typeof MOCK_BOX_HISTORY}
              selected={selected}
              onToggle={toggleSelected}
              onTogglePage={togglePage}
              allPageChecked={allPageChecked}
            />
          )}

          <div className="pt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
            <span>
              Page {page} of {totalPages} ({filtered.length} {itemLabel})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}