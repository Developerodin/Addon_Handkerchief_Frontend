'use client';

import { useCallback, useEffect, useState } from 'react';
import { factoryPage, PageResult } from '@/shared/services/factoryApi';

/**
 * Loads one paginated factory collection and exposes toolbar state.
 */
export function useFactoryList<T>(path: string, extra?: Record<string, string>, initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<PageResult<T>['counts']>(undefined);
  const extraKey = JSON.stringify(extra || {});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data: PageResult<T> = await factoryPage<T>(path, page, limit, search, extra);
      setRows(data.results || []);
      setTotal(data.totalResults || 0);
      setTotalPages(data.totalPages || 1);
      setCounts(data.counts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [path, page, limit, search, extraKey]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return {
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    rows,
    total,
    totalPages,
    loading,
    error,
    counts,
    reload,
  };
}
