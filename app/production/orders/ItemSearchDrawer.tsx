'use client';

import React, { useEffect, useState } from 'react';
import { listProducts, ProductListItem } from '@/shared/services/productService';

interface ItemSearchDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: ProductListItem) => void;
}

/**
 * Search catalog items by factory code, article, or name.
 */
export function ItemSearchDrawer({ open, onClose, onSelect }: ItemSearchDrawerProps) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ProductListItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      listProducts({ page: 1, limit: 25, search })
        .then((data) => {
          if (!cancelled) {
            setRows(data.results || []);
            setError('');
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load items');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Select item"
        className="flex h-full w-full max-w-md flex-col border-l-2 border-gray-300 bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b-2 border-gray-300 bg-gray-50 px-3 py-2">
          <h2 className="text-sm font-bold text-gray-800">Select item</h2>
          <button type="button" className="text-sm text-gray-600" onClick={onClose} aria-label="Close item search">
            Close
          </button>
        </header>
        <div className="border-b border-gray-200 p-3">
          <label className="form-label" htmlFor="item-search">
            Factory code, article, or name
          </label>
          <input
            id="item-search"
            aria-label="Search items"
            className="form-control"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
          />
        </div>
        {error ? (
          <p className="px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <ul className="flex-1 overflow-auto" aria-label="Items">
          {loading ? <li className="px-3 py-2 text-sm text-gray-500">Loading…</li> : null}
          {!loading && !rows.length ? <li className="px-3 py-2 text-sm text-gray-500">No items</li> : null}
          {rows.map((item) => (
            <li key={item.id} className="border-b border-gray-100">
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <span className="block text-sm font-semibold text-gray-800">{item.factoryCode || item.name}</span>
                <span className="block text-xs text-gray-500">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
