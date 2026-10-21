'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { UiButton, UiIconButton, UiStatusBadge } from '@/shared/components/ui';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { factoryRequest, PurchaseOrderRow } from '@/shared/services/factoryApi';

export default function DraftPurchaseOrdersPage() {
  const list = useFactoryList<PurchaseOrderRow>('/store/purchase-orders', { status: 'Draft' });
  const [draft, setDraft] = useState<PurchaseOrderRow | null>(null);
  const [rate, setRate] = useState('');
  const [gst, setGst] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  return (
    <RequireCrudPermission path="Fabric / Drafts" action="read">
      <CatalogListShell
        seoTitle="Drafts PO"
        title="Drafts PO"
        count={list.total}
        searchQuery={list.search}
        onSearchChange={list.setSearch}
        itemsPerPage={list.limit}
        onItemsPerPageChange={list.setLimit}
        canCreate
        addHref="/store/purchase-orders/add"
        addLabel="New purchase order"
        isLoading={list.loading}
        error={list.error}
        rows={list.rows}
        rowKey={(row) => row.id}
        currentPage={list.page}
        totalPages={list.totalPages}
        totalResults={list.total}
        onPageChange={list.setPage}
        columns={[
          { key: 'number', label: 'Number', render: (row) => row.number },
          { key: 'supplier', label: 'Supplier', render: (row) => row.supplierName },
          { key: 'status', label: 'Status', render: (row) => <UiStatusBadge status={row.status} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                <Link href={`/store/purchase-orders/edit/${row.id}`} className="ui-icon-btn ui-icon-btn--edit" title="Edit" aria-label="Edit draft">
                  <i className="ri-pencil-line text-xs" aria-hidden />
                </Link>
                <UiIconButton
                  icon="ri-send-plane-line"
                  tone="edit"
                  title="Submit"
                  aria-label="Submit purchase order"
                  onClick={async () => {
                    setError('');
                    try {
                      await factoryRequest(`/store/purchase-orders/${row.id}/submit`, { method: 'POST', body: '{}' });
                      setMessage(`${row.number} submitted`);
                      await list.reload();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Submit failed');
                    }
                  }}
                />
                <UiIconButton icon="ri-price-tag-3-line" tone="default" title="Rate" aria-label="Set rate" onClick={() => setDraft(row)} />
              </div>
            ),
          },
        ]}
      >
        {message ? <p className="px-4 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="px-4 text-sm text-red-600" role="alert">{error}</p> : null}
        {draft ? (
          <form
            className="grid gap-3 border-b border-gray-100 p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const line = draft.lines?.[0];
              if (!line) return;
              setError('');
              try {
                await factoryRequest(`/store/purchase-orders/${draft.id}/commercials`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    lineId: line.lineId,
                    rate: rate === '' ? undefined : Number(rate),
                    gstPercent: gst === '' ? undefined : Number(gst),
                  }),
                });
                setDraft(null);
                setMessage('Rate saved');
                await list.reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Save failed');
              }
            }}
          >
            <p className="text-sm font-medium">Rate and GST for {draft.number}</p>
            <label className="form-label" htmlFor="draft-rate">Rate</label>
            <input id="draft-rate" aria-label="Rate" className="form-control" type="number" value={rate} onChange={(event) => setRate(event.target.value)} />
            <label className="form-label" htmlFor="draft-gst">GST percent</label>
            <input id="draft-gst" aria-label="GST percent" className="form-control" type="number" value={gst} onChange={(event) => setGst(event.target.value)} />
            <UiButton type="submit" variant="primary">Save commercials</UiButton>
          </form>
        ) : null}
      </CatalogListShell>
    </RequireCrudPermission>
  );
}
