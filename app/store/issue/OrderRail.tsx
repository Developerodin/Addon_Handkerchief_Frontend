'use client';

import React from 'react';
import { ProductionOrderRow, FabricIssueRow } from '@/shared/services/factoryApi';
import { UiSearchInput } from '@/shared/components/ui';
import { formatOrderDate, orderIssueStatus } from './fabricIssueMath';
import { IssueStatusBadge } from './IssueStatusBadge';

/**
 * Open production orders. The card status follows issued rolls, not metres.
 */
export function OrderRail({
  orders,
  issues,
  loading,
  error,
  search,
  selectedId,
  onSearch,
  onSelect,
}: {
  orders: ProductionOrderRow[];
  issues: FabricIssueRow[];
  loading: boolean;
  error: string;
  search: string;
  selectedId: string;
  onSearch: (value: string) => void;
  onSelect: (orderId: string) => void;
}) {
  return (
    <aside className="border-b border-gray-200 lg:border-b-0 lg:border-r" aria-label="Orders">
      <div className="border-b border-gray-100 p-3">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">Orders</h2>
        <UiSearchInput
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search order or article"
          aria-label="Search order or article"
        />
      </div>
      <div className="max-h-[28rem] overflow-y-auto p-3 lg:max-h-[calc(100vh-12rem)]">
        {loading ? <p className="text-sm text-[#4B5563]">Loading orders</p> : null}
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && orders.length === 0 ? (
          <p className="text-sm text-[#4B5563]">No open orders. Release an order, then issue fabric here.</p>
        ) : null}
        <ul className="grid gap-2">
          {orders.map((order) => {
            const selected = order.id === selectedId;
            const status = orderIssueStatus(order, issues);
            return (
              <li key={order.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(order.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-[#111827]">{order.orderNumber || 'Order'}</span>
                    <IssueStatusBadge status={status} />
                  </span>
                  <span className="mt-1 block text-xs text-[#4B5563]">
                    {[order.orderNote, formatOrderDate(order.orderDate)].filter(Boolean).join(' · ') || order.buyer || 'No note'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
