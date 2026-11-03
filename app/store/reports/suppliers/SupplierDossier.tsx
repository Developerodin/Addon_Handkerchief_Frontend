import React from 'react';
import { formatQty, ReportTable } from '../ReportTable';
import { SupplierKpiStrip } from './SupplierKpiStrip';
import { SupplierPoTable } from './SupplierPoTable';
import { formatMeters } from './supplierFormat';
import { SupplierDetail } from './supplierTypes';

interface SupplierDossierProps {
  detail: SupplierDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}

/**
 * Lifetime purchase, fabric, QC, and return record for the selected supplier.
 */
export function SupplierDossier({ detail, loading, error, onClose }: SupplierDossierProps) {
  const kpis = detail?.kpis;
  const items = kpis
    ? [
        { label: 'POs', value: formatQty(kpis.orders), hint: 'Excluding drafts' },
        { label: 'Current', value: formatQty(kpis.currentOrders), hint: 'Still due' },
        { label: 'Ordered', value: formatQty(kpis.orderedQty), hint: 'Purchased till now' },
        { label: 'Received', value: formatQty(kpis.receivedQty), hint: 'On purchase orders' },
        { label: 'Fabrics', value: formatQty(kpis.fabricCount), hint: 'Distinct fabrics' },
        { label: 'QC pass', value: formatMeters(kpis.qcPassedMeters), hint: `${formatQty(kpis.qcPassedRolls)} rolls` },
        { label: 'QC fail', value: formatMeters(kpis.qcFailedMeters), hint: `${formatQty(kpis.qcFailedRolls)} rolls` },
        { label: 'QC held', value: formatMeters(kpis.qcHeldMeters), hint: `${formatQty(kpis.qcHeldRolls)} rolls` },
        { label: 'Returned', value: formatQty(kpis.returnQty), hint: `${formatQty(kpis.returns)} returns` },
      ]
    : [];

  return (
    <section className="grid gap-3" aria-labelledby="supplier-dossier-title" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="supplier-dossier-title" className="text-lg font-semibold text-gray-800">
          {detail?.header.supplierName || 'Supplier'}
        </h2>
        <button
          type="button"
          className="h-9 rounded-md px-2 text-sm font-semibold text-gray-500 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !detail ? (
        <p className="text-sm font-medium text-gray-500" role="status">
          Loading this supplier
        </p>
      ) : null}
      {detail ? (
        <>
          <p className="text-sm text-gray-500">
            {[detail.header.city, detail.header.status, detail.header.contactPerson].filter(Boolean).join(' · ') || 'No catalog details'}
          </p>
          <SupplierKpiStrip items={items} loading={loading} label={`${detail.header.supplierName} totals`} />
          <p className="text-sm text-gray-500">Pending QC: {formatQty(kpis?.qcPendingRolls || 0)} rolls</p>
          <ReportTable
            caption="Fabrics purchased"
            emptyLabel="No fabric purchased yet"
            columns={[
              { key: 'fabricName', label: 'Fabric' },
              { key: 'fabricTypeName', label: 'Type' },
              { key: 'orderedQty', label: 'Ordered', align: 'right' },
              { key: 'receivedQty', label: 'Received', align: 'right' },
            ]}
            rows={detail.fabrics.map((row) => ({
              fabricName: row.fabricName,
              fabricTypeName: row.fabricTypeName || '—',
              orderedQty: formatQty(row.orderedQty),
              receivedQty: formatQty(row.receivedQty),
            }))}
          />
          <SupplierPoTable caption="Current purchase orders" rows={detail.currentOrders} emptyLabel="No open purchase orders" />
          <SupplierPoTable caption="Recent purchase orders" rows={detail.recentOrders} emptyLabel="No purchase orders yet" />
          <ReportTable
            caption="Returns"
            emptyLabel="No returns"
            columns={[
              { key: 'reason', label: 'Reason' },
              { key: 'quantity', label: 'Qty', align: 'right' },
              { key: 'poNumber', label: 'PO' },
              { key: 'issuedAt', label: 'Date' },
            ]}
            rows={detail.returns.map((row) => ({
              reason: row.reason || '—',
              quantity: formatQty(row.quantity),
              poNumber: row.poNumber || '—',
              issuedAt: row.issuedAt ? new Date(row.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            }))}
          />
        </>
      ) : null}
    </section>
  );
}
