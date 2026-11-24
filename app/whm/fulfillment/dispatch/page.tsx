'use client';

import React, { useMemo, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import WhmDispatchTable from './components/WhmDispatchTable';
import { MOCK_DISPATCH_ORDERS } from './mockDispatchOrders';

type DispatchTab = 'active' | 'shipped';

export default function WhmFulfillmentDispatchPage() {
  const [tab, setTab] = useState<DispatchTab>('active');
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MOCK_DISPATCH_ORDERS.filter((row) => {
      if (row.tab !== tab) return false;
      if (!needle) return true;
      const blob = [row.orderNumber, row.motherWhRef, row.clientName, row.stage].join(' ').toLowerCase();
      return blob.includes(needle);
    });
  }, [tab, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageRows = filtered.slice((page - 1) * limit, page * limit);
  const pageIds = pageRows.map((r) => r.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const handleTabChange = (next: DispatchTab) => {
    setTab(next);
    setPage(1);
    setSelected(new Set());
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Dispatch" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 mb-4">
        <div className="p-[10px] flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
          <div className="flex items-start gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full mt-1" />
            <div>
              <h1 className="text-lg font-bold text-gray-800">Dispatch</h1>
              <p className="text-xs text-gray-500 mt-1">
                {tab === 'shipped'
                  ? 'Shipped challans and packlists to Addon Holding Mumbai.'
                  : 'Print packlist & dispatch challan, load vehicle, confirm shipment to Mumbai.'}
              </p>
            </div>
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
              className={`px-3 py-1.5 text-[12px] font-semibold rounded transition-colors ${
                tab === 'active' ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Needs Action
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'shipped'}
              onClick={() => handleTabChange('shipped')}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded transition-colors ${
                tab === 'shipped' ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Shipped / History
            </button>
          </div>

          {tab === 'shipped' ? (
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <span className="text-[11px] font-semibold text-gray-600 mr-1">Bulk shipment details:</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded border border-gray-200 bg-white hover:bg-gray-50"
              >
                <i className="ri-file-excel-2-line text-green-700" aria-hidden />
                Export Excel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded bg-violet-600 text-white hover:bg-violet-700"
              >
                <i className="ri-upload-2-line" aria-hidden />
                Import Excel
              </button>
            </div>
          ) : null}

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
            <div className="w-36">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-[12px]"
              />
            </div>
            <div className="w-36">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-[12px]"
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
          </div>

          <WhmDispatchTable
            rows={pageRows}
            variant={tab}
            selected={selected}
            onToggle={(id) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onToggleAll={(allChecked) => {
              setSelected((prev) => {
                const next = new Set(prev);
                pageIds.forEach((id) => {
                  if (allChecked) next.delete(id);
                  else next.add(id);
                });
                return next;
              });
            }}
            allChecked={allChecked}
          />

          <div className="pt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-[#495057]">
            <span>
              Page {page} of {totalPages} ({filtered.length} order{filtered.length === 1 ? '' : 's'})
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="disabled:opacity-30"
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