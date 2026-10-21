'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { factoryPage, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { formatInr } from '@/app/store/purchase-orders/add/purchaseOrderFormModel';
import { orderTotal } from '@/app/store/po-received/goodsReceivedModel';
import { finishedQcLots, historyQcRange } from './fabricQcLots';

export interface FabricQcHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Lists purchase orders that already have lot QC, then opens the read-only history view.
 */
export function FabricQcHistoryDrawer({ isOpen, onClose }: FabricQcHistoryDrawerProps) {
  const router = useRouter();
  const initial = historyQcRange();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await factoryPage<PurchaseOrderRow>('/quality/fabric-orders', 1, 100, '', {
        qcQueue: 'done',
        from,
        to,
      });
      setOrders(page.results || []);
    } catch (err) {
      setOrders([]);
      toast.error(err instanceof Error ? err.message : 'Could not load QC history');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!isOpen) return;
    load().catch(() => undefined);
  }, [isOpen, load]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter(
      (order) => order.number.toLowerCase().includes(query) || order.supplierName.toLowerCase().includes(query)
    );
  }, [orders, search]);

  /**
   * Closes the drawer and opens this PO in history view.
   */
  const openHistory = (order: PurchaseOrderRow) => {
    onClose();
    router.push(`/quality/fabric/process/${order.id}?view=history`);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl" aria-label="QC history">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 p-3">
          <div>
            <h2 className="text-base font-bold text-gray-800">QC History</h2>
            <p className="mt-0.5 text-[10px] text-gray-500">Last 12 months by default. Open a PO for the lot record.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Close QC history">
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search PO or supplier"
                className="w-full rounded border border-gray-200 py-1.5 pl-8 pr-3 text-[11px] font-medium"
                aria-label="Search QC history"
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400" aria-hidden />
            </div>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded border border-gray-200 px-2 py-1.5 text-[10px] font-medium" aria-label="History start date" />
            <span className="text-[10px] text-gray-400">to</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded border border-gray-200 px-2 py-1.5 text-[10px] font-medium" aria-label="History end date" />
            <button type="button" onClick={() => load()} disabled={loading} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2.5 py-1.5 text-[10px] font-bold uppercase text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <i className={`ri-refresh-line text-sm ${loading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="py-16 text-center text-[11px] font-medium text-gray-500">Loading QC history…</p>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <i className="ri-history-line mb-2 text-4xl text-gray-300" aria-hidden />
              <h3 className="mb-1 text-xs font-bold text-gray-400">No QC history</h3>
              <p className="text-[11px] text-gray-500">Pass or hold a received lot and it shows up here.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-gray-900">{order.number}</p>
                    <p className="truncate text-[11px] text-gray-600">{order.supplierName}</p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {order.purchaseDate ? new Date(order.purchaseDate).toLocaleDateString('en-IN') : '—'}
                      {' · '}
                      {formatInr(orderTotal(order.lines))}
                      {' · '}
                      {finishedQcLots(order).length} lot(s) QC&apos;d
                    </p>
                  </div>
                  <button type="button" onClick={() => openHistory(order)} className="inline-flex shrink-0 items-center gap-1 rounded bg-primary px-2.5 py-1.5 text-[10px] font-bold text-white" aria-label={`View QC history for ${order.number}`}>
                    <i className="ri-external-link-line text-xs" aria-hidden />
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
