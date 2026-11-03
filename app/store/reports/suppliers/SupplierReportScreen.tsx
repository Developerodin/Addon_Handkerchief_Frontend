'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { factoryRequest } from '@/shared/services/factoryApi';
import { SupplierDossier } from './SupplierDossier';
import { SupplierKpi, SupplierKpiStrip } from './SupplierKpiStrip';
import { SupplierTable } from './SupplierTable';
import { formatMeters } from './supplierFormat';
import { SupplierDetail, SuppliersReport } from './supplierTypes';
import { formatQty } from '../ReportTable';

/**
 * Writes the selected supplier into the query string.
 */
function supplierHref(current: URLSearchParams, pathname: string, name: string, selected: string): string {
  const next = new URLSearchParams(current.toString());
  if (!name || name === selected) next.delete('supplier');
  else next.set('supplier', name);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Page totals for every supplier, not the search filter.
 * @param report - List payload
 */
function pageKpis(report: SuppliersReport | null): SupplierKpi[] {
  const totals = report?.totals;
  const value = (amount: number | undefined) => (totals ? formatQty(amount || 0) : '—');
  const meters = (amount: number | undefined) => (totals ? formatMeters(amount || 0) : '—');
  return [
    { label: 'Suppliers', value: value(totals?.suppliers), hint: 'Catalog and orders' },
    { label: 'POs', value: value(totals?.orders), hint: 'Excluding drafts' },
    { label: 'Current', value: value(totals?.currentOrders), hint: 'Still due' },
    { label: 'Ordered', value: value(totals?.orderedQty), hint: 'Purchased till now' },
    { label: 'Received', value: value(totals?.receivedQty), hint: 'On purchase orders' },
    { label: 'QC pass', value: meters(totals?.qcPassedMeters), hint: 'Roll metres' },
    { label: 'QC fail', value: meters(totals?.qcFailedMeters), hint: 'Rejected metres' },
    { label: 'Returned', value: value(totals?.returnQty), hint: totals ? `${formatQty(totals.returns)} returns` : 'Vendor returns' },
  ];
}

/**
 * Supplier ledger. The query string holds the open dossier.
 */
export default function SupplierReportScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const supplier = params.get('supplier') || '';
  const [report, setReport] = useState<SuppliersReport | null>(null);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const openedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    factoryRequest<SuppliersReport>('/store/reports/suppliers')
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReport(null);
          setError(err instanceof Error ? err.message : 'Could not load suppliers');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (openedOnce.current || !report || supplier || report.suppliers.length !== 1) return;
    openedOnce.current = true;
    const only = report.suppliers[0].supplierName;
    router.replace(supplierHref(new URLSearchParams(params.toString()), pathname, only, ''), { scroll: false });
  }, [report, supplier, pathname, router, params]);

  useEffect(() => {
    if (!supplier) {
      setDetail(null);
      setDetailError('');
      setDetailLoading(false);
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    factoryRequest<SupplierDetail>(`/store/reports/suppliers/detail?name=${encodeURIComponent(supplier)}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(err instanceof Error ? err.message : 'Could not load this supplier');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplier]);

  const needle = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      (report?.suppliers || []).filter(
        (row) => !needle || `${row.supplierName} ${row.city} ${row.contactPerson}`.toLowerCase().includes(needle)
      ),
    [report, needle]
  );

  /**
   * Opens a supplier, or closes it when it is already open.
   */
  function openSupplier(name: string) {
    router.replace(supplierHref(new URLSearchParams(params.toString()), pathname, name, supplier), { scroll: false });
  }

  return (
    <RequireCrudPermission path="Fabric / Suppliers report" action="read">
      <CatalogMasterFormPage
        seoTitle="Suppliers report"
        title="Suppliers report"
        listHref="/store/reports/consumption"
        listLabel="Consumption report"
        currentLabel="Suppliers report"
      >
        <div className="grid gap-4 p-4" aria-busy={loading}>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <SupplierKpiStrip items={pageKpis(report)} loading={loading} label="Supplier totals" />
          <label className="grid max-w-xs gap-1 text-xs font-bold uppercase text-gray-500">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm font-medium normal-case text-gray-800"
              placeholder="Supplier, city, or contact"
              aria-label="Search suppliers"
            />
          </label>
          <SupplierTable
            rows={rows}
            selected={supplier}
            emptyLabel={report ? 'No suppliers yet' : 'Loading suppliers'}
            onOpen={openSupplier}
          />
          {supplier ? (
            <SupplierDossier detail={detail} loading={detailLoading} error={detailError} onClose={() => openSupplier(supplier)} />
          ) : (
            <p className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500">
              Click a supplier name to see fabrics, purchase orders, QC, and returns.
            </p>
          )}
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
