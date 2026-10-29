'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { UiButton, UiIconButton, UiStatusBadge } from '@/shared/components/ui';
import { DrawerSection, DrawerStat, FactoryDrawer } from '@/shared/components/factory/FactoryDrawer';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { factoryRequest, LotRow, PageResult, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { downloadPurchaseOrderRowsExcel, downloadPurchaseOrdersExcel } from './downloadPurchaseOrdersExcel';
import { PurchaseOrderPrintMenu } from './PurchaseOrderPrintMenu';
import { CutoffApprovedDrawer } from './CutoffApprovedDrawer';
import { MarkInTransitDrawer } from './MarkInTransitDrawer';
import { PurchaseOrderSummary } from './purchaseOrderSummary';
import { defaultPoDateRange, PurchaseOrderDateBar, PurchaseOrderToolbarActions } from './purchaseOrderListFilters';
import { usePurchaseOrderSelection } from './usePurchaseOrderSelection';

export default function PurchaseOrdersPage() {
  const initialRange = defaultPoDateRange();
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [exporting, setExporting] = useState(false);
  const list = useFactoryList<PurchaseOrderRow>('/store/purchase-orders', { status, from, to, excludeDraft: '1' });
  const [view, setView] = useState<PurchaseOrderRow | null>(null);
  const [viewLots, setViewLots] = useState<LotRow[]>([]);
  const [transit, setTransit] = useState<PurchaseOrderRow | null>(null);
  const [cutoff, setCutoff] = useState<PurchaseOrderRow | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<PurchaseOrderRow | null>(null);
  const [rate, setRate] = useState('');
  const [gst, setGst] = useState('');
  const selection = usePurchaseOrderSelection(list.rows, `${status}|${from}|${to}|${list.search}`);
  const downloadLabel = selection.selectAll
    ? `Download all (${list.total})`
    : selection.selectedIds.length > 0
      ? `Download Excel (${selection.selectedIds.length})`
      : 'Download Excel';

  /**
   * Loads lots for one purchase order.
   */
  const lotsFor = async (poId: string) => {
    const data = await factoryRequest<PageResult<LotRow>>(`/store/lots?poId=${poId}&limit=20`);
    return data.results || [];
  };

  /**
   * Submits a draft or opens a lot from its fabric lines.
   */
  const act = async (path: string, body?: object, method = 'POST') => {
    setError('');
    try {
      await factoryRequest(path, { method, body: body ? JSON.stringify(body) : method === 'DELETE' ? undefined : '{}' });
      toast.success('Saved');
      selection.clear();
      await list.reload();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <RequireCrudPermission path="Fabric / Purchase orders" action="read">
      <CatalogListShell
        seoTitle="All PO"
        title="All PO"
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
        selectable={{
          selectedIds: selection.selectedIds,
          selectAll: selection.selectAll,
          indeterminate: selection.indeterminate,
          selectAllLabel: 'Select all purchase orders',
          onSelectAll: selection.onSelectAll,
          onSelect: selection.onSelect,
          getRowId: (row) => row.id,
        }}
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
              list.setPage(1);
            }}
          />
        }
        extraToolbarActions={
          <PurchaseOrderToolbarActions
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              list.setPage(1);
            }}
            downloading={exporting}
            downloadDisabled={list.loading || (!selection.selectAll && selection.selectedIds.length === 0)}
            downloadLabel={downloadLabel}
            onDownload={async () => {
              setError('');
              setExporting(true);
              try {
                const count = selection.selectAll
                  ? await downloadPurchaseOrdersExcel({ status, from, to, search: list.search })
                  : await downloadPurchaseOrderRowsExcel(selection.selectedRows());
                toast.success(
                  selection.selectAll
                    ? `Exported all ${count} purchase order${count === 1 ? '' : 's'}`
                    : `Exported ${count} selected purchase order${count === 1 ? '' : 's'}`
                );
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Export failed');
              } finally {
                setExporting(false);
              }
            }}
          />
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
          {
            key: 'summary',
            label: 'Summary',
            render: (row) => <PurchaseOrderSummary order={row} />,
          },
          {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                <UiIconButton
                  icon="ri-eye-line"
                  tone="view"
                  title="View"
                  aria-label="View purchase order"
                  onClick={async () => {
                    setView(row);
                    setViewLots(await lotsFor(row.id).catch(() => []));
                  }}
                />
                <PurchaseOrderPrintMenu orderId={row.id} poNumber={row.number} />
                {row.status === 'Draft' || row.status === 'Submitted to Vendor' ? (
                  <Link href={`/store/purchase-orders/edit/${row.id}`} className="ui-icon-btn ui-icon-btn--edit" title="Edit" aria-label="Edit purchase order">
                    <i className="ri-pencil-line text-xs" aria-hidden />
                  </Link>
                ) : null}
                {row.status === 'Submitted to Vendor' || row.status === 'In Transit' ? (
                  <UiIconButton
                    icon="ri-delete-bin-line"
                    tone="delete"
                    title="Delete"
                    aria-label="Delete purchase order"
                    onClick={async () => {
                      if (!window.confirm(`Delete ${row.number}?`)) return;
                      await act(`/store/purchase-orders/${row.id}`, undefined, 'DELETE');
                    }}
                  />
                ) : null}
                {row.status === 'Submitted to Vendor' || row.status === 'Partially Received' || row.status === 'In Transit' ? (
                  <>
                    <UiButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setError('');
                        setTransit(row);
                      }}
                    >
                      Mark in transit
                    </UiButton>
                    <UiButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setError('');
                        setCutoff(row);
                      }}
                    >
                      Cutoff Approve
                    </UiButton>
                  </>
                ) : null}
                {row.status === 'Submitted to Vendor' ? (
                  <UiIconButton
                    icon="ri-inbox-archive-line"
                    tone="edit"
                    title="Open lot"
                    aria-label="Open lot"
                    onClick={() =>
                      act('/store/lots', {
                        poId: row.id,
                        cutoffs: (row.lines || []).map((line) => ({ fabricId: line.fabricId || line.lineId })),
                      })
                    }
                  />
                ) : null}
              </div>
            ),
          },
        ]}
      >
        <Toaster position="top-right" />
        {error ? (
          <p className="px-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {draft ? (
          <form
            className="grid gap-3 p-4 border-b border-gray-100"
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
                toast.success('Rate saved');
                selection.clear();
                await list.reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Save failed');
              }
            }}
          >
            <p className="text-sm font-medium">Rate and GST for {draft.number}, first line only while Draft</p>
            <label className="form-label" htmlFor="po-rate">
              Rate
            </label>
            <input id="po-rate" aria-label="Rate" className="form-control" type="number" value={rate} onChange={(event) => setRate(event.target.value)} />
            <label className="form-label" htmlFor="po-gst">
              GST percent
            </label>
            <input id="po-gst" aria-label="GST percent" className="form-control" type="number" value={gst} onChange={(event) => setGst(event.target.value)} />
            <UiButton type="submit" variant="primary">
              Save commercials
            </UiButton>
          </form>
        ) : null}
      </CatalogListShell>
      <MarkInTransitDrawer
        order={transit}
        onClose={() => setTransit(null)}
        onSaved={async () => {
          setTransit(null);
          selection.clear();
          await list.reload();
        }}
      />
      <CutoffApprovedDrawer
        order={cutoff}
        onClose={() => setCutoff(null)}
        onSaved={async () => {
          const savedId = cutoff?.id;
          setCutoff(null);
          if (savedId && view?.id === savedId) setViewLots(await lotsFor(savedId));
          await list.reload();
        }}
      />
      <FactoryDrawer
        title={view?.number || 'Purchase order'}
        subtitle={view?.supplierName}
        status={view?.status}
        open={Boolean(view)}
        onClose={() => setView(null)}
      >
        {view ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              <DrawerStat label="Order date" value={view.purchaseDate ? new Date(view.purchaseDate).toLocaleDateString('en-GB') : '—'} />
              <DrawerStat label="Expected" value={view.estimatedDelivery ? new Date(view.estimatedDelivery).toLocaleDateString('en-GB') : '—'} />
              <DrawerStat label="Ordered" value={(view.lines || []).reduce((sum, line) => sum + (line.quantity || 0), 0)} />
              <DrawerStat label="Lines" value={(view.lines || []).length} />
            </div>
            <DrawerSection title="Lines">
              <table>
                <thead>
                  <tr>
                    <th>Fabric</th>
                    <th>Sort No</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>GST</th>
                  </tr>
                </thead>
                <tbody>
                  {(view.lines || []).map((line) => (
                    <tr key={line.lineId}>
                      <td>{line.fabricName || line.lineId}</td>
                      <td>{line.fabricSortNo || '—'}</td>
                      <td>{line.quantity}</td>
                      <td>{line.rate ?? 0}</td>
                      <td>{line.gstPercent ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DrawerSection>
            <DrawerSection title="Lots">
              <div className="flex flex-wrap gap-2 p-3">
                {viewLots.length === 0 ? <p className="text-sm text-gray-500">No lot yet. Open a lot from the row.</p> : null}
                {viewLots.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <UiStatusBadge status={item.status} />
                    {item.status === 'pending-cutoff' ? (
                      <>
                        <UiButton
                          type="button"
                          variant="primary"
                          onClick={async () => {
                            const saved = await act(`/store/lots/${item.id}/cutoffs`, {
                              decisions: (item.cutoffs || []).map((cutoff) => ({ fabricId: cutoff.fabricId, approved: true })),
                            });
                            if (saved && view) setViewLots(await lotsFor(view.id));
                          }}
                        >
                          Approve cutoffs
                        </UiButton>
                        <UiButton type="button" variant="danger" onClick={() => act(`/store/lots/${item.id}/cutoffs`, { decisions: (item.cutoffs || []).map((cutoff) => ({ fabricId: cutoff.fabricId, approved: false })) })}>
                          Reject
                        </UiButton>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </DrawerSection>
            <DrawerSection title="Status history">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Status</th>
                    <th>User</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(view.statusHistory || []).map((row, index) => (
                    <tr key={`${row.status}-${index}`}>
                      <td>{row.at ? new Date(row.at).toLocaleString('en-GB') : ''}</td>
                      <td>{row.status}</td>
                      <td>{row.userName || '—'}</td>
                      <td>{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DrawerSection>
          </>
        ) : null}
      </FactoryDrawer>
    </RequireCrudPermission>
  );
}
