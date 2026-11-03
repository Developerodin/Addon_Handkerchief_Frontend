'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { UiButton } from '@/shared/components/ui';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { DraftPoFromRequisition, FabricRequisitionRow, factoryRequest } from '@/shared/services/factoryApi';

const WORKFLOWS = [
  { value: 'in_requisition', label: 'In requisition' },
  { value: 'sent_to_draft', label: 'Sent to draft' },
  { value: 'order_placed', label: 'Order placed' },
  { value: 'all', label: 'All' },
];

const STAGE_LABEL: Record<string, string> = {
  in_requisition: 'In requisition',
  sent_to_draft: 'Sent to draft',
  order_placed: 'Order placed',
  dismissed: 'Dismissed',
};

/**
 * Metres with a thousands separator and up to three decimals.
 * @param value
 */
function metres(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(Number(value) || 0);
}

/**
 * Fabric rows whose stored and QC-passed metres are at or below the catalog minimum.
 * Create draft PO opens a draft, or adds the fabric onto the latest draft for that supplier.
 */
export default function FabricRequisitionPage() {
  const { hasCrudPermission } = useNavigation();
  const canUpdate = hasCrudPermission('Fabric / Requisitions', 'update');
  const [workflow, setWorkflow] = useState('in_requisition');
  const [busyId, setBusyId] = useState('');
  const [pickedSupplier, setPickedSupplier] = useState<Record<string, string>>({});
  const list = useFactoryList<FabricRequisitionRow>('/store/requisitions', { workflow });

  /**
   * Saves the supplier chosen on an open row.
   * @param row
   * @param supplierId
   */
  const saveSupplier = async (row: FabricRequisitionRow, supplierId: string) => {
    if (!supplierId) return;
    setPickedSupplier((current) => ({ ...current, [row.id]: supplierId }));
    setBusyId(row.id);
    try {
      await factoryRequest(`/store/requisitions/${row.id}/supplier`, {
        method: 'PATCH',
        body: JSON.stringify({ supplierId }),
      });
      setPickedSupplier((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the supplier');
    } finally {
      setBusyId('');
    }
  };

  /**
   * Creates a draft PO or merges this fabric onto the supplier's latest draft.
   * @param row
   * @param supplierId
   */
  const createDraft = async (row: FabricRequisitionRow, supplierId: string) => {
    setBusyId(row.id);
    try {
      const result = await factoryRequest<DraftPoFromRequisition>(`/store/requisitions/${row.id}/draft-po`, {
        method: 'POST',
        body: JSON.stringify({ supplierId }),
      });
      const number = result.purchaseOrder?.number || 'draft';
      if (result.alreadyStaged) toast.success(`${row.fabricName} is already on ${number}`);
      else if (result.merged) toast.success(`Added ${row.fabricName} to draft ${number}`);
      else toast.success(`Draft ${number} created`);
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the draft PO');
    } finally {
      setBusyId('');
    }
  };

  /**
   * Hides an open requisition that is not on a draft yet.
   * @param row
   */
  const dismiss = async (row: FabricRequisitionRow) => {
    setBusyId(row.id);
    try {
      await factoryRequest(`/store/requisitions/${row.id}/dismiss`, { method: 'PATCH' });
      toast.success(`${row.fabricName} dismissed`);
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not dismiss');
    } finally {
      setBusyId('');
    }
  };

  return (
    <RequireCrudPermission path="Fabric / Requisitions" action="read">
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Requisition list"
        title="Requisition list"
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
        emptyIcon="ri-file-list-3-line"
        extraToolbarActions={
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="sr-only">Workflow</span>
            <select
              aria-label="Workflow"
              className="h-9 rounded border border-gray-200 bg-white px-2 text-sm"
              value={workflow}
              onChange={(event) => {
                setWorkflow(event.target.value);
                list.setPage(1);
              }}
            >
              {WORKFLOWS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        }
        columns={[
          {
            key: 'fabric',
            label: 'Fabric',
            render: (row) => (
              <span>
                <span className="font-medium text-gray-900">{row.fabricName || 'Fabric'}</span>
                {row.fabricSortNo ? <span className="mt-0.5 block text-xs text-gray-500">{row.fabricSortNo}</span> : null}
              </span>
            ),
          },
          { key: 'colour', label: 'Colour', render: (row) => row.colourName || '—' },
          { key: 'min', label: 'Min qty', render: (row) => metres(row.minQty) },
          { key: 'onHand', label: 'On hand', render: (row) => metres(row.onHandMeters) },
          {
            key: 'supplier',
            label: 'Supplier',
            cellClassName: 'min-w-[13rem]',
            render: (row) => {
              const locked = row.workflowStage !== 'in_requisition';
              const supplierId = pickedSupplier[row.id] ?? row.preferredSupplierId ?? '';
              const supplierName = row.suppliers.find((supplier) => supplier.id === supplierId)?.name || '';
              return (
                <select
                  aria-label={`Supplier for ${row.fabricName || 'fabric'}`}
                  title={supplierName || 'Select supplier'}
                  className="box-border h-8 w-full min-w-[12rem] appearance-none rounded border border-gray-200 bg-white py-0 pl-2 pr-8 text-left text-sm font-medium leading-[30px] text-gray-900 disabled:bg-gray-50"
                  value={supplierId}
                  disabled={locked || !canUpdate || busyId === row.id}
                  onChange={(event) => {
                    saveSupplier(row, event.target.value).catch(() => undefined);
                  }}
                >
                  <option value="">Select supplier</option>
                  {row.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              );
            },
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className="ui-status-badge ui-status-badge--pending">{STAGE_LABEL[row.workflowStage] || row.workflowStage}</span>
            ),
          },
          {
            key: 'draft',
            label: 'Draft PO',
            render: (row) =>
              row.attachedDraftPoId && row.draftPoNumber ? (
                <Link href={`/store/purchase-orders/edit/${row.attachedDraftPoId}`} className="text-sm font-medium text-primary">
                  {row.draftPoNumber}
                </Link>
              ) : (
                '—'
              ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => {
              const open = row.workflowStage === 'in_requisition';
              const supplierId = pickedSupplier[row.id] ?? row.preferredSupplierId ?? '';
              return (
                <div className="flex items-center justify-end gap-2">
                  {open ? (
                    <>
                      <UiButton
                        type="button"
                        variant="primary"
                        className="!h-8 !px-2 text-xs"
                        disabled={!canUpdate || !supplierId || busyId === row.id}
                        onClick={() => {
                          createDraft(row, supplierId).catch(() => undefined);
                        }}
                      >
                        Create draft PO
                      </UiButton>
                      <UiButton
                        type="button"
                        variant="secondary"
                        className="!h-8 !px-2 text-xs"
                        disabled={!canUpdate || busyId === row.id}
                        onClick={() => {
                          dismiss(row).catch(() => undefined);
                        }}
                      >
                        Dismiss
                      </UiButton>
                    </>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />
    </RequireCrudPermission>
  );
}
