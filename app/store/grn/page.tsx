'use client';

import React, { useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { UiButton } from '@/shared/components/ui';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { ReceiptRow } from '@/shared/services/factoryApi';
import { PurchaseOrderDateBar } from '@/app/store/purchase-orders/purchaseOrderListFilters';
import { historyQcRange } from '@/app/quality/fabric/fabricQcLots';
import { GrnDrawer } from './GrnDrawer';
import { GrnSummary } from './GrnSummary';

/**
 * GRN history and monthly summary. Receipts are created when a PO is processed.
 */
export default function GrnHistoryPage() {
  const initial = historyQcRange();
  const [tab, setTab] = useState<'history' | 'summary'>('history');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [activeId, setActiveId] = useState('');
  const list = useFactoryList<ReceiptRow>('/store/receipts', { from, to });

  const tabs = (
    <div className="flex gap-1" role="tablist" aria-label="GRN sections">
      <UiButton type="button" role="tab" variant={tab === 'history' ? 'primary' : 'secondary'} aria-selected={tab === 'history'} onClick={() => setTab('history')}>
        History
      </UiButton>
      <UiButton type="button" role="tab" variant={tab === 'summary' ? 'primary' : 'secondary'} aria-selected={tab === 'summary'} onClick={() => setTab('summary')}>
        Monthly summary
      </UiButton>
    </div>
  );

  if (tab === 'summary') {
    return (
      <RequireCrudPermission path="Fabric / GRN history" action="read">
        <div className="main-content !p-[10px]">
          <div className="border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-sm font-bold text-gray-800">GRN history</h1>
              {tabs}
            </div>
            <GrnSummary />
          </div>
        </div>
      </RequireCrudPermission>
    );
  }

  return (
    <RequireCrudPermission path="Fabric / GRN history" action="read">
      <CatalogListShell
        seoTitle="GRN history"
        title="GRN history"
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
        extraToolbarActions={tabs}
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
              const next = historyQcRange();
              setFrom(next.from);
              setTo(next.to);
              list.setPage(1);
            }}
          />
        }
        columns={[
          { key: 'number', label: 'GRN', render: (row) => row.number },
          { key: 'supplier', label: 'Supplier', render: (row) => row.supplierName || '—' },
          { key: 'rolls', label: 'Rolls', render: (row) => row.rollCount ?? 0 },
          { key: 'net', label: 'Net', render: (row) => row.netWeight ?? 0 },
          { key: 'who', label: 'Receiver', render: (row) => row.receiver || '—' },
          {
            key: 'when',
            label: 'When',
            render: (row) => (row.receivedDate ? new Date(row.receivedDate).toLocaleDateString('en-IN') : ''),
          },
          {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            render: (row) => (
              <UiButton type="button" variant="primary" aria-label={`View ${row.number}`} onClick={() => setActiveId(row.id)}>
                View
              </UiButton>
            ),
          },
        ]}
      >
        {activeId ? (
          <GrnDrawer
            id={activeId}
            onClose={() => setActiveId('')}
            onSaved={() => {
              list.reload().catch(() => undefined);
            }}
          />
        ) : null}
      </CatalogListShell>
    </RequireCrudPermission>
  );
}
