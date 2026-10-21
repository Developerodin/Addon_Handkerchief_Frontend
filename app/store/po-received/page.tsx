'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { UiButton, UiStatusBadge } from '@/shared/components/ui';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { factoryRequest, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { PurchaseOrderSummary } from '../purchase-orders/purchaseOrderSummary';
import { defaultPoDateRange, PurchaseOrderDateBar } from '../purchase-orders/purchaseOrderListFilters';
import { GoodsReceivedDrawer } from './GoodsReceivedDrawer';

const RECEIVED_STATUSES = ['In Transit', 'Partially Received', 'Received'];

/**
 * Purchase orders that are in transit, partly received, or fully received.
 */
export default function PoReceivedPage() {
  const initialRange = defaultPoDateRange();
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const list = useFactoryList<PurchaseOrderRow>('/store/purchase-orders', {
    from,
    to,
    statusIn: status || RECEIVED_STATUSES.join(','),
  });
  const router = useRouter();
  const [receiving, setReceiving] = useState<PurchaseOrderRow | null>(null);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');

  /**
   * Opens the goods-received drawer. Cutoff checks happen inside it.
   */
  const openReceived = (order: PurchaseOrderRow) => {
    setError('');
    setReceiving(order);
  };

  /**
   * Creates one barcode per received roll, then opens the process page.
   * A second click does not mint extra barcodes.
   */
  const processOrder = async (order: PurchaseOrderRow) => {
    const lots = (order.receivedLots || []).filter((lot) => Number(lot.rolls) > 0);
    if (!lots.length) {
      toast.error('Add received lot rolls before processing');
      return;
    }
    setProcessingId(order.id);
    setError('');
    try {
      const result = await factoryRequest<{ created: number }>(`/store/purchase-orders/${order.id}/process-rolls`, {
        method: 'POST',
        body: '{}',
      });
      toast.success(result.created ? `${result.created} roll barcode${result.created === 1 ? '' : 's'} created` : 'Roll barcodes are ready');
      router.push(`/store/po-received/process/${order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not process this order';
      setError(message);
      toast.error(message);
    } finally {
      setProcessingId('');
    }
  };

  return (
    <RequireCrudPermission path="Fabric / Receipts" action="read">
      <CatalogListShell
        seoTitle="PO received"
        title="PO received"
        count={list.total}
        searchQuery={list.search}
        onSearchChange={list.setSearch}
        itemsPerPage={list.limit}
        onItemsPerPageChange={list.setLimit}
        isLoading={list.loading}
        error={list.error}
        rows={list.rows}
        rowKey={(row) => row.id}
        currentPage={list.page}
        totalPages={list.totalPages}
        totalResults={list.total}
        onPageChange={list.setPage}
        toolbarFooter={
          <PurchaseOrderDateBar
            from={from}
            to={to}
            onFromChange={(value) => {
              setFrom(value);
              list.setPage(1);
            }}
            onToChange={(value) => {
              setTo(value);
              list.setPage(1);
            }}
            onReset={() => {
              const next = defaultPoDateRange();
              setFrom(next.from);
              setTo(next.to);
              setStatus('');
              list.setPage(1);
            }}
          />
        }
        extraToolbarActions={
          <div className="catalog-page-size-wrap">
            <select
              aria-label="Status"
              className="catalog-page-size-select !min-w-[9.5rem]"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                list.setPage(1);
              }}
            >
              <option value="">All</option>
              {RECEIVED_STATUSES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <i className="ri-arrow-down-s-line catalog-page-size-select__icon" aria-hidden />
          </div>
        }
        columns={[
          { key: 'number', label: 'PO number', render: (row) => row.number },
          { key: 'supplier', label: 'Supplier', render: (row) => row.supplierName },
          {
            key: 'date',
            label: 'Order date',
            render: (row) => (row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString() : ''),
          },
          {
            key: 'due',
            label: 'Expected delivery',
            render: (row) => (row.estimatedDelivery ? new Date(row.estimatedDelivery).toLocaleDateString() : ''),
          },
          { key: 'status', label: 'Status', render: (row) => <UiStatusBadge status={row.status} /> },
          { key: 'summary', label: 'Summary', render: (row) => <PurchaseOrderSummary order={row} variant="amount" /> },
          {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                {row.status === 'Partially Received' || row.status === 'Received' ? (
                  <UiButton type="button" variant="secondary" icon="ri-barcode-line" loading={processingId === row.id} disabled={Boolean(processingId)} onClick={() => processOrder(row)}>
                    Process
                  </UiButton>
                ) : null}
                <UiButton type="button" variant="primary" icon="ri-checkbox-circle-line" onClick={() => openReceived(row)}>
                  Goods Received
                </UiButton>
              </div>
            ),
          },
        ]}
      >
        <Toaster position="top-right" />
        {error ? <p className="px-4 text-sm text-red-600" role="alert">{error}</p> : null}
        {receiving ? (
          <GoodsReceivedDrawer
            key={receiving.id}
            order={receiving}
            onClose={() => setReceiving(null)}
            onSaved={async () => {
              setReceiving(null);
              await list.reload();
            }}
          />
        ) : null}
      </CatalogListShell>
    </RequireCrudPermission>
  );
}
