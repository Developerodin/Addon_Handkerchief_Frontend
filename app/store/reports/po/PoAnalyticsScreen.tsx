'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { factoryRequest } from '@/shared/services/factoryApi';
import { defaultPoDateRange } from '../../purchase-orders/purchaseOrderListFilters';
import { PoDossier } from './PoDossier';
import { PoFilters } from './PoFilters';
import { PoKpiStrip } from './PoKpiStrip';
import { PoOrderTable } from './PoOrderTable';
import { PoSupplierBars } from './PoSupplierBars';
import { PoWeekStrip } from './PoWeekStrip';
import { PoAnalyticsReport, PoDossier as PoDossierData } from './poAnalyticsTypes';

/**
 * Writes one filter into the query string and drops empty values.
 */
function writeParams(current: URLSearchParams, patch: Record<string, string>): string {
  const next = new URLSearchParams(current.toString());
  Object.entries(patch).forEach(([key, value]) => {
    if (!value) next.delete(key);
    else next.set(key, value);
  });
  return next.toString();
}

/**
 * Purchase-order ledger and the dossier for the selected order.
 */
export default function PoAnalyticsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const defaults = useMemo(() => defaultPoDateRange(), []);
  const allDates = params.get('dates') === 'all';
  const from = allDates ? '' : params.get('from') || defaults.from;
  const to = allDates ? '' : params.get('to') || defaults.to;
  const dateField = params.get('dateField') === 'received' ? 'received' : 'purchase';
  const supplier = params.get('supplier') || '';
  const status = params.get('status') || '';
  const query = params.get('q') || '';
  const includeDrafts = params.get('includeDrafts') === '1';
  const poId = params.get('po') || '';

  const [report, setReport] = useState<PoAnalyticsReport | null>(null);
  const [dossier, setDossier] = useState<PoDossierData | null>(null);
  const [error, setError] = useState('');
  const [dossierError, setDossierError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dossierLoading, setDossierLoading] = useState(false);

  const listQuery = useMemo(() => {
    const search = new URLSearchParams();
    if (!allDates) {
      if (from) search.set('from', from);
      if (to) search.set('to', to);
    }
    if (dateField === 'received') search.set('dateField', 'received');
    if (supplier) search.set('supplier', supplier);
    if (status) search.set('status', status);
    if (query) search.set('q', query);
    if (includeDrafts) search.set('includeDrafts', '1');
    return search.toString();
  }, [allDates, from, to, dateField, supplier, status, query, includeDrafts]);

  /**
   * Replaces the page query without scrolling the ledger away.
   */
  function replace(patch: Record<string, string>) {
    const next = writeParams(new URLSearchParams(params.toString()), patch);
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    factoryRequest<PoAnalyticsReport>(`/store/reports/po?${listQuery}`)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReport(null);
          setError(err instanceof Error ? err.message : 'Could not load purchase orders');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listQuery]);

  useEffect(() => {
    if (!poId) {
      setDossier(null);
      setDossierError('');
      return undefined;
    }
    let cancelled = false;
    setDossierLoading(true);
    setDossierError('');
    factoryRequest<PoDossierData>(`/store/reports/po/${poId}`)
      .then((data) => {
        if (!cancelled) setDossier(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDossier(null);
          setDossierError(err instanceof Error ? err.message : 'Could not load this order');
        }
      })
      .finally(() => {
        if (!cancelled) setDossierLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [poId]);

  return (
    <RequireCrudPermission path="Fabric / PO analytics" action="read">
      <CatalogMasterFormPage
        seoTitle="PO analytics"
        title="PO analytics"
        listHref="/store/purchase-orders"
        listLabel="All PO"
        currentLabel="PO analytics"
        singleColumn
      >
        <div className="grid gap-4 bg-[#F4F1EC] p-3">
          {error ? (
            <p className="text-sm font-medium text-[#9F1239]" role="alert">
              {error}
            </p>
          ) : null}
          <PoFilters
            values={{
              from,
              to,
              allDates,
              dateField,
              supplier,
              status,
              query,
              includeDrafts,
              suppliers: report?.supplierOptions || [],
            }}
            onChange={(patch) =>
              replace({
                from: patch.from ?? (allDates ? '' : from),
                to: patch.to ?? (allDates ? '' : to),
                dates: patch.allDates ? 'all' : patch.from != null || patch.to != null ? '' : allDates ? 'all' : '',
                dateField: (patch.dateField ?? dateField) === 'received' ? 'received' : '',
                supplier: patch.supplier ?? supplier,
                status: patch.status ?? status,
                q: patch.query ?? query,
                includeDrafts: (patch.includeDrafts ?? includeDrafts) ? '1' : '',
              })
            }
            onReset={() => replace({ from: '', to: '', dates: '', dateField: '', supplier: '', status: '', q: '', includeDrafts: '' })}
          />
          <PoKpiStrip totals={report?.totals || null} loading={loading} />
          <div className={poId ? 'hidden lg:contents' : 'contents'}>
            <PoWeekStrip weeks={report?.byWeek || []} />
            <PoSupplierBars
              rows={report?.bySupplier || []}
              ready={Boolean(report)}
              selected={supplier}
              onSelect={(name) => replace({ supplier: name })}
            />
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
            <div className={poId ? 'hidden lg:block' : 'block'}>
              <PoOrderTable
                rows={report?.orders || []}
                selectedId={poId}
                onOpen={(id) => replace({ po: id })}
                emptyLabel={loading && !report ? 'Loading purchase orders' : 'No purchase orders in this range.'}
                emptyAction={
                  !report || allDates ? null : (
                    <button
                      type="button"
                      className="mt-2 font-semibold text-[rgb(132,90,223)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]"
                      onClick={() => replace({ dates: 'all', from: '', to: '' })}
                    >
                      Show all dates
                    </button>
                  )
                }
              />
            </div>
            <div className={poId ? 'block' : 'hidden lg:block'}>
              <PoDossier dossier={dossier} loading={dossierLoading} error={dossierError} onBack={() => replace({ po: '' })} />
            </div>
          </div>
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
