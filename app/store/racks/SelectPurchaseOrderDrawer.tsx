'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PurchaseOrderLine, PurchaseOrderRow } from '@/shared/services/factoryApi';

export interface SelectPurchaseOrderDrawerProps {
  open: boolean;
  orders: PurchaseOrderRow[];
  selectedId: string;
  loading?: boolean;
  onSearch: (value: string) => void;
  onSelect: (order: PurchaseOrderRow) => void;
  onClose: () => void;
}

/**
 * Line total including GST, same basis as the purchase-order summary.
 */
function orderAmount(lines: PurchaseOrderLine[]): number {
  return lines.reduce((sum, line) => {
    const sub = (line.quantity || 0) * (line.rate || 0);
    return sum + sub + (sub * (line.gstPercent || 0)) / 100;
  }, 0);
}

/**
 * Rupee amount. Whole rupees stay compact; paise keep two decimals.
 */
function formatPoAmount(value: number): string {
  const hasFraction = Math.round(value * 100) % 100 !== 0;
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * True when the query is an amount, so it should not be sent as a name search.
 */
export function isAmountQuery(value: string): boolean {
  const text = value.trim();
  return text !== '' && /^[\d,.\s₹]+$/.test(text);
}

/**
 * Right drawer to search received purchase orders and pick one.
 */
export function SelectPurchaseOrderDrawer({
  open,
  orders,
  selectedId,
  loading = false,
  onSearch,
  onSelect,
  onClose,
}: SelectPurchaseOrderDrawerProps) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    const frame = window.requestAnimationFrame(() => setShown(true));
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      setShown(false);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => onSearch(query), 250);
    return () => window.clearTimeout(timer);
  }, [query, open, onSearch]);

  const visible = useMemo(() => filterOrders(orders, query), [orders, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 transition-opacity ${shown ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Close purchase order picker"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-po-title"
        className={`relative flex h-full w-full max-w-[440px] flex-col bg-white shadow-2xl transition-transform duration-200 ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="select-po-title" className="text-base font-bold text-gray-900">Select Purchase Order</h2>
          <button
            type="button"
            className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            aria-label="Close"
            onClick={onClose}
          >
            <i className="ri-close-line text-lg leading-none" aria-hidden />
          </button>
        </header>
        <div className="border-b border-gray-100 px-5 py-3">
          <label className="relative block" htmlFor="storage-po-search">
            <span className="sr-only">Search purchase orders</span>
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              ref={inputRef}
              id="storage-po-search"
              type="search"
              value={query}
              placeholder="Search by PO number, supplier, amount..."
              className="w-full rounded-md border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4" role="listbox" aria-label="Purchase orders">
          {loading && !visible.length ? <p className="py-8 text-center text-sm text-gray-500">Loading purchase orders…</p> : null}
          {!loading && !visible.length ? (
            <p className="py-8 text-center text-sm text-gray-500">No purchase orders match your search.</p>
          ) : null}
          <ul className="space-y-3">
            {visible.map((order) => {
              const selected = order.id === selectedId;
              const amount = formatPoAmount(orderAmount(order.lines || []));
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${selected ? 'border-primary bg-primary/[0.06]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    onClick={() => onSelect(order)}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-gray-900">{order.number}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        {order.supplierName || '—'} · {amount}
                      </span>
                    </span>
                    {selected ? <i className="ri-check-line shrink-0 text-lg text-primary" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

/**
 * Keeps orders whose number, supplier, or amount contains the query.
 */
function filterOrders(orders: PurchaseOrderRow[], query: string): PurchaseOrderRow[] {
  const needle = query.trim().toLowerCase().replace(/₹/g, '').replace(/,/g, '');
  if (!needle) return orders;
  return orders.filter((order) => {
    const amount = formatPoAmount(orderAmount(order.lines || [])).toLowerCase().replace(/₹/g, '').replace(/,/g, '');
    const supplier = (order.supplierName || '').toLowerCase();
    return order.number.toLowerCase().includes(needle) || supplier.includes(needle) || amount.includes(needle);
  });
}
