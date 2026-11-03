'use client';

import React, { useCallback, useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { FabricAnalyticsTable } from './FabricAnalyticsTable';
import { FabricKpiStrip } from './FabricKpiStrip';
import {
  FabricAnalyticsQuery,
  FabricAnalyticsReport,
  FabricAnalyticsSort,
  loadFabricAnalytics,
} from './fabricAnalytics';

const EMPTY_QUERY: FabricAnalyticsQuery = {
  page: 1,
  limit: 20,
  search: '',
  sortBy: 'fabricName',
  sortOrder: 'asc',
};

/**
 * Fabric analytics. Search is debounced; sort and pages hit one report API.
 */
export default function FabricAnalyticsPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [query, setQuery] = useState<FabricAnalyticsQuery>(EMPTY_QUERY);
  const [report, setReport] = useState<FabricAnalyticsReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = draftSearch.trim();
      setQuery((current) => (current.search === next ? current : { ...current, search: next, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draftSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFabricAnalytics(query)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load fabric analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const patch = useCallback((next: Partial<FabricAnalyticsQuery>) => {
    setQuery((current) => ({ ...current, ...next }));
  }, []);

  /**
   * Toggles a column. A new column starts descending for quantities and ascending for name.
   * @param field - Server sort field
   */
  function sortBy(field: FabricAnalyticsSort) {
    const starting = field === 'fabricName' ? 'asc' : 'desc';
    patch({
      sortBy: field,
      sortOrder: query.sortBy === field && query.sortOrder === 'asc' ? 'desc' : query.sortBy === field ? 'asc' : starting,
      page: 1,
    });
  }

  return (
    <RequireCrudPermission path="Fabric / Fabric analytics" action="read">
      <CatalogMasterFormPage
        seoTitle="Fabric analytics"
        title="Fabric analytics"
        listHref="/store/reports/live-inventory"
        listLabel="Live inventory"
        currentLabel="Fabric analytics"
      >
        <div className="grid gap-4 p-4">
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <FabricKpiStrip summary={report?.summary || null} loading={loading} />
          <FabricAnalyticsTable
            rows={report?.results || []}
            loading={loading}
            page={report?.page || query.page}
            limit={query.limit}
            totalPages={report?.totalPages || 0}
            totalResults={report?.totalResults || 0}
            search={draftSearch}
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSearchChange={setDraftSearch}
            onLimitChange={(limit) => patch({ limit, page: 1 })}
            onPageChange={(page) => patch({ page })}
            onSort={sortBy}
            onClear={() => {
              setDraftSearch('');
              setQuery(EMPTY_QUERY);
            }}
          />
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
