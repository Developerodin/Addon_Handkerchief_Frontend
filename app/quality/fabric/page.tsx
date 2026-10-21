'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { UiButton, UiStatusBadge } from '@/shared/components/ui';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { PurchaseOrderRow } from '@/shared/services/factoryApi';
import { PurchaseOrderSummary } from '@/app/store/purchase-orders/purchaseOrderSummary';
import { PurchaseOrderDateBar } from '@/app/store/purchase-orders/purchaseOrderListFilters';
import { defaultQcRange, pendingQcCount } from './fabricQcLots';
import { FabricQcHistoryDrawer } from './FabricQcHistoryDrawer';

/**
 * Purchase orders whose received lots are still waiting for fabric QC.
 */
export default function FabricQcPage() {
  const initial = defaultQcRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [historyOpen, setHistoryOpen] = useState(false);
  const router = useRouter();
  const list = useFactoryList<PurchaseOrderRow>('/quality/fabric-orders', { from, to, qcQueue: 'pending' });

  return (
    <RequireCrudPermission path="Quality / Fabric QC" action="read">
      <CatalogListShell
        seoTitle="Fabric QC"
        title="Fabric QC"
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
              const next = defaultQcRange();
              setFrom(next.from);
              setTo(next.to);
              list.setPage(1);
            }}
          />
        }
        extraToolbarActions={
          <UiButton type="button" variant="secondary" icon="ri-history-line" aria-label="Open QC history" onClick={() => setHistoryOpen(true)}>
            QC History
          </UiButton>
        }
        columns={[
          { key: 'number', label: 'PO number', render: (row) => row.number },
          { key: 'supplier', label: 'Supplier', render: (row) => row.supplierName },
          {
            key: 'date',
            label: 'Order date',
            render: (row) => (row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString('en-IN') : ''),
          },
          {
            key: 'due',
            label: 'Expected delivery',
            render: (row) => (row.estimatedDelivery ? new Date(row.estimatedDelivery).toLocaleDateString('en-IN') : ''),
          },
          { key: 'status', label: 'Status', render: (row) => <UiStatusBadge status={row.status} /> },
          { key: 'summary', label: 'Total amount', render: (row) => <PurchaseOrderSummary order={row} variant="amount" /> },
          { key: 'lots', label: 'QC lots', render: (row) => String(pendingQcCount(row)) },
          {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            render: (row) => (
              <UiButton type="button" variant="primary" icon="ri-box-3-line" aria-label={`Process QC for ${row.number}`} onClick={() => router.push(`/quality/fabric/process/${row.id}`)}>
                Process
              </UiButton>
            ),
          },
        ]}
      >
        <FabricQcHistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      </CatalogListShell>
    </RequireCrudPermission>
  );
}
