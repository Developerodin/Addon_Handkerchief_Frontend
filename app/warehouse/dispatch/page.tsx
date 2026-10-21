'use client';

import React, { useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { BoxRow, factoryRequest } from '@/shared/services/factoryApi';

export default function DispatchPage() {
  const boxes = useFactoryList<BoxRow>('/warehouse/boxes');
  const [trace, setTrace] = useState('');
  const [error, setError] = useState('');

  return (
    <RequireCrudPermission path="Warehouse / Dispatch" action="read">
      <CatalogListShell
        seoTitle="Dispatch"
        title="Dispatch"
        count={boxes.total}
        searchQuery={boxes.search}
        onSearchChange={boxes.setSearch}
        itemsPerPage={boxes.limit}
        onItemsPerPageChange={boxes.setLimit}
        isLoading={boxes.loading}
        error={boxes.error}
        rows={boxes.rows}
        rowKey={(row) => row.id}
        currentPage={boxes.page}
        totalPages={boxes.totalPages}
        totalResults={boxes.total}
        onPageChange={boxes.setPage}
        columns={[
          { key: 'barcode', label: 'Box', render: (row) => row.barcode },
          { key: 'status', label: 'Status', render: (row) => row.status },
          { key: 'address', label: 'Address', render: (row) => row.clientAddress || '' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                {row.status !== 'dispatched' ? (
                  <button
                    type="button"
                    className="ti-btn ti-btn-sm ti-btn-primary"
                    onClick={async () => {
                      setError('');
                      try {
                        await factoryRequest('/warehouse/dispatch', {
                          method: 'POST',
                          body: JSON.stringify({ boxBarcode: row.barcode, eventId: `dsp-${row.barcode}`, site: 'factory' }),
                        });
                        await boxes.reload();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Dispatch failed');
                      }
                    }}
                  >
                    Dispatch
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ti-btn ti-btn-sm ti-btn-outline-primary"
                  onClick={async () => {
                    setError('');
                    try {
                      const data = await factoryRequest<Record<string, unknown>>(`/warehouse/boxes/${encodeURIComponent(row.barcode)}/trace`);
                      setTrace(JSON.stringify(data, null, 2));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Trace failed');
                    }
                  }}
                >
                  Trace
                </button>
              </div>
            ),
          },
        ]}
      >
        {error ? (
          <p className="px-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {trace ? (
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded m-4 p-3 overflow-auto" aria-label="Trace">
            {trace}
          </pre>
        ) : null}
      </CatalogListShell>
    </RequireCrudPermission>
  );
}
