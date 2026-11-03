'use client';

import React, { useCallback, useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { LiveInventorySummary } from './LiveInventorySummary';
import { LiveInventoryTable } from './LiveInventoryTable';
import { UnallocatedRollsDrawer } from './UnallocatedRollsDrawer';
import {
  InventoryStatus,
  LiveInventoryQuery,
  LiveInventoryReport,
  LiveInventoryRow,
  LiveInventorySort,
  downloadLiveInventoryCsv,
  loadLiveInventory,
} from './liveInventory';

const EMPTY_QUERY: LiveInventoryQuery = {
  page: 1,
  limit: 20,
  search: '',
  status: 'all',
  sortBy: 'fabricName',
  sortOrder: 'asc',
};

/**
 * Fabric live inventory. Search is debounced; sort, status, and pages hit the report API.
 */
export default function LiveInventoryPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [query, setQuery] = useState<LiveInventoryQuery>(EMPTY_QUERY);
  const [report, setReport] = useState<LiveInventoryReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [drawerFabric, setDrawerFabric] = useState<LiveInventoryRow | null>(null);

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
    loadLiveInventory(query)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load live inventory');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const patch = useCallback((next: Partial<LiveInventoryQuery>) => {
    setQuery((current) => ({ ...current, ...next }));
  }, []);

  const closeDrawer = useCallback(() => setDrawerFabric(null), []);

  /**
   * Downloads the rows matching the current filter.
   */
  async function exportCsv() {
    setExporting(true);
    setError('');
    try {
      await downloadLiveInventoryCsv(query);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not export inventory');
    } finally {
      setExporting(false);
    }
  }

  /**
   * Toggles a column. A new column starts ascending.
   * @param field - Server sort field
   */
  function sortBy(field: LiveInventorySort) {
    patch({
      sortBy: field,
      sortOrder: query.sortBy === field && query.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    });
  }

  return (
    <RequireCrudPermission path="Fabric / Live inventory" action="read">
      <CatalogMasterFormPage
        seoTitle="Live inventory"
        title="Live inventory"
        listHref="/store/racks"
        listLabel="Fabric storage"
        currentLabel="Live inventory"
      >
        <div className="grid gap-4 p-4">
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <LiveInventorySummary
            summary={report?.summary || null}
            statusFilter={query.status}
            onLowStock={() => patch({ status: query.status === 'Low Stock' ? 'all' : 'Low Stock', page: 1 })}
          />
          <LiveInventoryTable
            rows={report?.results || []}
            loading={loading}
            page={report?.page || query.page}
            limit={query.limit}
            totalPages={report?.totalPages || 0}
            totalResults={report?.totalResults || 0}
            search={draftSearch}
            status={query.status}
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            exporting={exporting}
            onSearchChange={setDraftSearch}
            onStatusChange={(status: 'all' | InventoryStatus) => patch({ status, page: 1 })}
            onLimitChange={(limit) => patch({ limit, page: 1 })}
            onPageChange={(page) => patch({ page })}
            onSort={sortBy}
            onExport={exportCsv}
            onClear={() => {
              setDraftSearch('');
              setQuery(EMPTY_QUERY);
            }}
            onUnallocated={setDrawerFabric}
          />
        </div>
        <UnallocatedRollsDrawer key={drawerFabric?.fabricId || 'closed'} fabric={drawerFabric} onClose={closeDrawer} />
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
