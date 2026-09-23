'use client';

import { useCallback, useEffect, useState } from 'react';

export interface CatalogListFetchResult<T> {
  results: T[];
  totalPages: number;
  totalResults: number;
}

export interface UseCatalogListStateOptions<T> {
  fetchFn: (params: { page: number; limit: number; search: string }) => Promise<CatalogListFetchResult<T>>;
  initialPageSize?: number;
  errorMessage?: string;
}

export function useCatalogListState<T>({
  fetchFn,
  initialPageSize = 10,
  errorMessage = 'Failed to load data',
}: UseCatalogListStateOptions<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(initialPageSize);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFn({ page: currentPage, limit: itemsPerPage, search: searchQuery });
      setRows(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage);
      setRows([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, fetchFn, errorMessage]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedIds.length === 0) setSelectAll(false);
  }, [selectedIds]);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(rows.map((r) => String((r as { id: string }).id)));
      setSelectAll(true);
    }
  }, [selectAll, rows]);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSelectAll(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectAll(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    rows,
    setRows,
    isLoading,
    error,
    itemsPerPage,
    setItemsPerPage,
    totalResults,
    totalPages,
    selectedIds,
    setSelectedIds,
    selectAll,
    importProgress,
    setImportProgress,
    refresh,
    handleSelectAll,
    handleSelect,
    clearSelection,
  };
}
