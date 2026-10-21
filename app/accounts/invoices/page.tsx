'use client';

import React, { useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { BoxRow, factoryRequest, InvoiceRow, ProductionOrderRow } from '@/shared/services/factoryApi';
import { getProductById } from '@/shared/services/productService';

export default function InvoicesPage() {
  const invoices = useFactoryList<InvoiceRow>('/accounts/invoices');
  const boxes = useFactoryList<BoxRow>('/warehouse/boxes', { status: 'dispatched' });
  const orders = useFactoryList<ProductionOrderRow>('/production/orders');
  const [boxId, setBoxId] = useState('');
  const [hsn, setHsn] = useState('');
  const [gst, setGst] = useState('');
  const [error, setError] = useState('');

  return (
    <RequireCrudPermission path="Accounts / Invoices" action="read">
      <CatalogListShell
        seoTitle="Invoices"
        title="Invoices"
        count={invoices.total}
        searchQuery={invoices.search}
        onSearchChange={invoices.setSearch}
        itemsPerPage={invoices.limit}
        onItemsPerPageChange={invoices.setLimit}
        isLoading={invoices.loading}
        error={invoices.error}
        rows={invoices.rows}
        rowKey={(row) => row.id}
        currentPage={invoices.page}
        totalPages={invoices.totalPages}
        totalResults={invoices.total}
        onPageChange={invoices.setPage}
        columns={[
          { key: 'number', label: 'Number', render: (row) => row.number },
          { key: 'pieces', label: 'Pieces', render: (row) => row.lines?.[0]?.pieceCount ?? 0 },
          { key: 'address', label: 'Address', render: (row) => row.clientAddress || '' },
        ]}
      >
        <form
          className="grid gap-3 p-4 border-b border-gray-100"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              await factoryRequest('/accounts/invoices', {
                method: 'POST',
                body: JSON.stringify({ boxId, hsn, gst }),
              });
              await invoices.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Invoice failed');
            }
          }}
        >
          <label className="form-label" htmlFor="boxId">
            Dispatched box
          </label>
          <select
            id="boxId"
            aria-label="Dispatched box"
            className="form-control"
            required
            value={boxId}
            onChange={async (event) => {
              const nextId = event.target.value;
              setBoxId(nextId);
              const box = boxes.rows.find((row) => row.id === nextId);
              const order = orders.rows.find((row) => row.id === box?.productionOrderId);
              if (!order?.itemId) return;
              const product = await getProductById(order.itemId);
              if (!product) return;
              setHsn(String(product.hsnCode || ''));
              setGst(String(product.gst || ''));
            }}
          >
            <option value="">Select box</option>
            {boxes.rows.map((box) => (
              <option key={box.id} value={box.id}>
                {box.barcode}
              </option>
            ))}
          </select>
          <input aria-label="HSN" className="form-control" placeholder="HSN" value={hsn} onChange={(event) => setHsn(event.target.value)} />
          <input aria-label="GST" className="form-control" placeholder="GST" value={gst} onChange={(event) => setGst(event.target.value)} />
          <button type="submit" className="ti-btn ti-btn-primary w-fit">
            Open invoice
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
