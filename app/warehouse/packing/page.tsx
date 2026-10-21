'use client';

import React, { useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { factoryRequest, PackingBundleRow, ProductionOrderRow } from '@/shared/services/factoryApi';

export default function PackingPage() {
  const bundles = useFactoryList<PackingBundleRow>('/warehouse/packing-bundles');
  const orders = useFactoryList<ProductionOrderRow>('/production/orders');
  const [orderId, setOrderId] = useState('');
  const [qty, setQty] = useState('');
  const [revisionId, setRevisionId] = useState('');
  const [error, setError] = useState('');

  return (
    <RequireCrudPermission path="Warehouse / Packing" action="read">
      <CatalogListShell
        seoTitle="Packing"
        title="Packing"
        count={bundles.total}
        searchQuery={bundles.search}
        onSearchChange={bundles.setSearch}
        itemsPerPage={bundles.limit}
        onItemsPerPageChange={bundles.setLimit}
        isLoading={bundles.loading}
        error={bundles.error}
        rows={bundles.rows}
        rowKey={(row) => row.id}
        currentPage={bundles.page}
        totalPages={bundles.totalPages}
        totalResults={bundles.total}
        onPageChange={bundles.setPage}
        columns={[
          { key: 'barcode', label: 'Barcode', render: (row) => row.barcode },
          { key: 'qty', label: 'Qty', render: (row) => row.qty },
          { key: 'rack', label: 'On packing rack', render: (row) => (row.onPackingRack ? 'Yes' : 'No') },
        ]}
      >
        <form
          className="grid gap-3 p-4 border-b border-gray-100"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              await factoryRequest('/warehouse/packing-bundles', {
                method: 'POST',
                body: JSON.stringify({ orderId, qty: Number(qty), revisionId }),
              });
              setQty('');
              await bundles.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Packing failed');
            }
          }}
        >
          <label className="form-label" htmlFor="orderId">
            Production order
          </label>
          <select
            id="orderId"
            aria-label="Production order"
            className="form-control"
            required
            value={orderId}
            onChange={(event) => {
              const next = orders.rows.find((order) => order.id === event.target.value);
              setOrderId(event.target.value);
              setRevisionId(next?.revisionId || '');
            }}
          >
            <option value="">Select order</option>
            {orders.rows.map((order) => (
              <option key={order.id} value={order.id}>
                {order.productionType} · {order.revisionId}
              </option>
            ))}
          </select>
          <label className="form-label" htmlFor="qty">
            Quantity
          </label>
          <input id="qty" aria-label="Quantity" className="form-control" type="number" required min={1} value={qty} onChange={(event) => setQty(event.target.value)} />
          <label className="form-label" htmlFor="revisionId">
            Revision
          </label>
          <input id="revisionId" aria-label="Revision" className="form-control" value={revisionId} readOnly />
          <button type="submit" className="ti-btn ti-btn-primary w-fit">
            Pack
          </button>
        </form>
        {error ? (
          <p className="px-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </CatalogListShell>
    </RequireCrudPermission>
  );
}
