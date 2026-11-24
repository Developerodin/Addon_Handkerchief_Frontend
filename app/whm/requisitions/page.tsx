'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import WhmRequisitionCreateOrderModal from './components/WhmRequisitionCreateOrderModal';
import WhmRequisitionListTable from './components/WhmRequisitionListTable';
import {
  DEMO_REQUISITION_TOTAL,
  INITIAL_REQUISITION_ROWS,
  type WhmRequisitionPriority,
  type WhmRequisitionRow,
} from './mockRequisitions';

let nextTrimOrderSeq = 1;

function nextTrimOrderNumber() {
  const n = nextTrimOrderSeq;
  nextTrimOrderSeq += 1;
  return `TRO-2026-${String(n).padStart(4, '0')}`;
}

export default function WhmRequisitionsPage() {
  const [rows, setRows] = useState<WhmRequisitionRow[]>(() =>
    INITIAL_REQUISITION_ROWS.map((r) => ({ ...r }))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | WhmRequisitionPriority>('all');
  const [workflowFilter, setWorkflowFilter] = useState<'all' | WhmRequisitionRow['workflowStage']>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const filtered = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !row.materialName.toLowerCase().includes(needle)) return false;
      if (priorityFilter !== 'all' && row.priority !== priorityFilter) return false;
      if (workflowFilter !== 'all' && row.workflowStage !== workflowFilter) return false;
      const day = row.lastUpdated.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [rows, searchTerm, priorityFilter, workflowFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageRows = filtered.slice((page - 1) * limit, page * limit);
  const selectedCount = selectedIds.size;

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)),
    [rows, selectedIds]
  );

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback((pageIds: string[], allChecked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (allChecked) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const openCreateModal = () => {
    if (selectedCount === 0) return;
    setCreateModalOpen(true);
  };

  const updateOrder = () => {
    if (selectedIds.size === 0) return;
    const orderNo = nextTrimOrderNumber();
    const now = new Date().toISOString();
    const ids = selectedIds;

    setRows((prev) =>
      prev.map((row) => {
        if (!ids.has(row.id)) return row;
        return {
          ...row,
          draftPoQuantity: row.qty,
          workflowStage: 'order_created',
          lastUpdated: now,
        };
      })
    );
    setLastOrderNumber(orderNo);
    setSelectedIds(new Set());
    setCreateModalOpen(false);
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Requisition list" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {lastOrderNumber ? (
            <div
              className="mb-3 flex flex-wrap items-center gap-2 rounded border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] text-violet-900"
              role="status"
            >
              <i className="ri-checkbox-circle-fill text-violet-600" aria-hidden />
              <span className="font-bold">Order created — {lastOrderNumber}</span>
              <span className="text-violet-700">Selected materials moved to draft PO qty and status updated.</span>
              <button
                type="button"
                className="ml-auto text-violet-600 hover:text-violet-800 font-semibold"
                onClick={() => setLastOrderNumber(null)}
              >
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Requisition list</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {DEMO_REQUISITION_TOTAL}
              </span>
              {selectedCount > 0 ? (
                <span className="bg-violet-100 text-violet-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {selectedCount} selected
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/whm/orders/"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                <i className="ri-arrow-left-line" aria-hidden />
                Back
              </Link>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <i className="ri-shopping-cart-2-line" aria-hidden />
                Create order
                {selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <i className="ri-file-excel-2-line" aria-hidden />
                Download Excel
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
                placeholder="Search material / trim…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                aria-label="Search material name"
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            </div>
            <input
              type="date"
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-36"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="Last updated from"
            />
            <input
              type="date"
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-36"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="Last updated to"
            />
            <select
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-36"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as typeof priorityFilter);
                setPage(1);
              }}
              aria-label="Alert status filter"
            >
              <option value="all">All alerts</option>
              <option value="urgent">Urgent</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 min-w-[148px]"
              value={workflowFilter}
              onChange={(e) => {
                setWorkflowFilter(e.target.value as typeof workflowFilter);
                setPage(1);
              }}
              aria-label="Status filter"
            >
              <option value="all">All statuses</option>
              <option value="in_requisition">In requisition</option>
              <option value="sent_to_draft">Sent to draft</option>
              <option value="order_placed">Order placed</option>
              <option value="order_created">Order created</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <WhmRequisitionListTable
            rows={pageRows}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onTogglePage={togglePage}
          />
        </div>

        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <p className="text-[11px] font-medium text-[#495057] tracking-tight">
            Page <span>{page}</span> of <span>{totalPages}</span>
            <span className="ml-2 text-[10px] text-gray-400">(demo · {filtered.length} rows)</span>
          </p>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <WhmRequisitionCreateOrderModal
        open={createModalOpen && selectedRows.length > 0}
        rows={selectedRows}
        onClose={() => setCreateModalOpen(false)}
        onUpdateOrder={updateOrder}
      />
    </div>
  );
}