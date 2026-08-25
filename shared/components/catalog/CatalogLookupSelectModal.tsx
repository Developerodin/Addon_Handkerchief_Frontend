'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface CatalogLookupColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface CatalogLookupSelectModalProps<T> {
  open: boolean;
  title: string;
  searchPlaceholder?: string;
  items: T[];
  columns: CatalogLookupColumn<T>[];
  getItemKey: (item: T) => string;
  filterItem?: (item: T, search: string) => boolean;
  pageSize?: number;
  onClose: () => void;
  onSelect: (item: T) => void;
}

function defaultFilter<T extends { name?: string }>(item: T, search: string) {
  if (!search.trim()) return true;
  const query = search.trim().toLowerCase();
  return String(item.name ?? '')
    .toLowerCase()
    .includes(query);
}

export function CatalogLookupSelectModal<T extends { name?: string }>({
  open,
  title,
  searchPlaceholder = 'Search...',
  items,
  columns,
  getItemKey,
  filterItem = defaultFilter,
  pageSize = 15,
  onClose,
  onSelect,
}: CatalogLookupSelectModalProps<T>) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [open, searchInput]);

  useEffect(() => {
    if (!open) {
      setSearchInput('');
      setSearch('');
      setPage(1);
    }
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredItems = useMemo(
    () => items.filter((item) => filterItem(item, search)),
    [items, search, filterItem]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pageItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
              <i className="ri-close-line text-xl" />
            </button>
          </div>
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full form-control pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {pageItems.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">No records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-left">
                  <thead className="bg-gray-50/80">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200"
                        >
                          {column.label}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => (
                      <tr key={getItemKey(item)} className="hover:bg-gray-50/50 border-b border-gray-100">
                        {columns.map((column) => (
                          <td key={column.key} className="px-3 py-2 text-[12px] text-gray-700 border border-gray-200">
                            {column.render ? column.render(item) : String((item as Record<string, unknown>)[column.key] ?? '—')}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right border border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(item);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100"
                          >
                            <i className="ri-check-line" /> Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {filteredItems.length > pageSize && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
              <span>
                Page {page} of {totalPages} • {filteredItems.length} total
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
