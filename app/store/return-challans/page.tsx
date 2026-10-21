'use client';

import React, { useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { UiButton } from '@/shared/components/ui';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { VendorReturnRow } from '@/shared/services/factoryApi';
import { PurchaseOrderDateBar } from '@/app/store/purchase-orders/purchaseOrderListFilters';
import { historyQcRange } from '@/app/quality/fabric/fabricQcLots';
import { printHtmlDocument } from '@/shared/utils/printHtmlDocument';
import { challanBody } from './challanDocument';
import { ChallanDrawer } from './ChallanDrawer';

/**
 * Saved return challans: filter, open, print, or download.
 */
export default function ReturnChallanPage() {
  const initial = historyQcRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [active, setActive] = useState<VendorReturnRow | null>(null);
  const list = useFactoryList<VendorReturnRow>('/store/vendor-returns', { from, to });

  return (
    <RequireCrudPermission path="Fabric / Return challan" action="read">
      <CatalogListShell
        seoTitle="PO return challan"
        title="PO return challan"
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
              const next = historyQcRange();
              setFrom(next.from);
              setTo(next.to);
              list.setPage(1);
            }}
          />
        }
        columns={[
          { key: 'challan', label: 'Challan', render: (row) => row.challanNumber || row.id.slice(-6) },
          { key: 'po', label: 'PO', render: (row) => row.poNumber || row.poId },
          { key: 'supplier', label: 'Supplier', render: (row) => row.supplierName || '—' },
          { key: 'reason', label: 'Reason', render: (row) => row.reason },
          { key: 'qty', label: 'Qty', render: (row) => row.quantity ?? row.rollBarcodes?.length ?? 0 },
          {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end gap-1">
                <UiButton type="button" variant="secondary" aria-label={`View ${row.challanNumber || 'challan'}`} onClick={() => setActive(row)}>
                  View
                </UiButton>
                <UiButton type="button" variant="primary" aria-label={`Print ${row.challanNumber || 'challan'}`} onClick={() => printHtmlDocument(row.challanNumber || 'Return challan', challanBody(row))}>
                  Print
                </UiButton>
              </div>
            ),
          },
        ]}
      >
        {active ? <ChallanDrawer row={active} onClose={() => setActive(null)} /> : null}
      </CatalogListShell>
    </RequireCrudPermission>
  );
}
