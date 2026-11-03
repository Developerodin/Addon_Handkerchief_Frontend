'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { factoryRequest } from '@/shared/services/factoryApi';
import { ConsumptionDayBars } from './ConsumptionDayBars';
import { ConsumptionDetail } from './ConsumptionDetail';
import { ConsumptionFabricCards } from './ConsumptionFabricCards';
import { ConsumptionFilters } from './ConsumptionFilters';
import { ConsumptionKpis } from './ConsumptionKpis';
import { ConsumptionOrderTable } from './ConsumptionOrderTable';
import { ConsumptionBand, ConsumptionDetail as ConsumptionDetailData, ConsumptionReport, ConsumptionSelection } from './consumptionTypes';
import { viewDays, viewFabrics, viewOrders, viewTotals } from './consumptionView';

/**
 * Writes one filter into the query string and drops empty values.
 * @param current - Current query string
 * @param patch - Keys to set. An empty value removes the key.
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
 * Consumption report. Cards, days, and orders are selected from the query string.
 */
export default function ConsumptionScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const query = params.get('q') || '';
  const fabric = params.get('fabric') || '';
  const fabricId = params.get('fabricId') || '';
  const orderId = params.get('order') || '';
  const day = params.get('day') || '';
  const bandParam = params.get('band') || '';
  const band: ConsumptionSelection['band'] = bandParam === 'over' || bandParam === 'under' || bandParam === 'match' ? bandParam : '';
  const pendingQuery = useRef(params.toString());

  useEffect(() => {
    pendingQuery.current = params.toString();
  }, [params]);

  const [report, setReport] = useState<ConsumptionReport | null>(null);
  const [detail, setDetail] = useState<ConsumptionDetailData | null>(null);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const selection: ConsumptionSelection = { from, to, query, fabric, fabricId, orderId, day, band };
  const listQuery = useMemo(() => {
    const search = new URLSearchParams();
    if (from) search.set('from', from);
    if (to) search.set('to', to);
    const text = search.toString();
    return text ? `?${text}` : '';
  }, [from, to]);

  /**
   * Replaces the page query without scrolling the report away.
   * @param patch - Keys to set. An empty value removes the key.
   */
  function replace(patch: Record<string, string>) {
    const next = writeParams(new URLSearchParams(pendingQuery.current), patch);
    pendingQuery.current = next;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    factoryRequest<ConsumptionReport>(`/store/reports/consumption${listQuery}`)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReport(null);
          setError(err instanceof Error ? err.message : 'Could not load consumption');
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
    if (!orderId && !fabric && !fabricId && !day) {
      setDetail(null);
      setDetailError('');
      setDetailLoading(false);
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    const search = new URLSearchParams();
    if (from) search.set('from', from);
    if (to) search.set('to', to);
    if (orderId) search.set('orderId', orderId);
    if (fabric) search.set('fabric', fabric);
    if (fabricId) search.set('fabricId', fabricId);
    if (day) search.set('day', day);
    factoryRequest<ConsumptionDetailData>(`/store/reports/consumption/detail?${search.toString()}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(err instanceof Error ? err.message : 'Could not load this selection');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, orderId, fabric, fabricId, day]);

  const totals = report ? viewTotals(report, selection) : null;
  const fabrics = report ? viewFabrics(report, selection) : [];
  const days = report ? viewDays(report, selection) : [];
  const orders = report ? viewOrders(report, selection) : [];
  const active = Boolean(orderId || fabric || fabricId || day);
  const narrowed = Boolean(from || to || day || fabric || query.trim());

  /**
   * Toggles a variance band. Clicking the active band clears it.
   * @param next - Band to apply
   */
  function pickBand(next: '' | ConsumptionBand) {
    replace({ band: next });
  }

  return (
    <RequireCrudPermission path="Fabric / Consumption report" action="read">
      <CatalogMasterFormPage
        seoTitle="Consumption report"
        title="Consumption report"
        listHref="/store/reports/fabric"
        listLabel="Fabric analytics"
        currentLabel="Consumption report"
        singleColumn
      >
        <div className="grid gap-4 bg-[#F4F1EC] p-3">
          <p className="text-sm font-medium text-[#57534E]">Metres issued to orders against the bill of material, by fabric, order, and date.</p>
          {narrowed ? (
            <p className="text-[13px] font-medium text-[#57534E]">Issued metres follow this selection. BOM stays the full order requirement.</p>
          ) : null}
          {error ? (
            <p className="text-sm font-medium text-[#9F1239]" role="alert">
              {error}
            </p>
          ) : null}
          <ConsumptionFilters
            values={{ from, to, query }}
            onChange={(patch) =>
              replace({
                from: patch.from ?? from,
                to: patch.to ?? to,
                q: patch.query ?? query,
              })
            }
            onReset={() => router.replace(pathname, { scroll: false })}
          />
          <ConsumptionKpis totals={totals} loading={loading} band={band} narrowed={narrowed} onBand={pickBand} />
          <div className={orderId ? 'hidden lg:contents' : 'contents'}>
            <ConsumptionFabricCards
              rows={fabrics}
              selected={fabric}
              onSelect={(name, id) => replace({ fabric: fabric === name ? '' : name, fabricId: fabric === name ? '' : id })}
            />
            <ConsumptionDayBars days={days} selected={day} onSelect={(next) => replace({ day: day === next ? '' : next })} />
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
            <div className={orderId ? 'hidden lg:block' : 'block'}>
              <ConsumptionOrderTable
                rows={orders}
                selectedId={orderId}
                onOpen={(id) => replace({ order: orderId === id ? '' : id })}
                emptyLabel={loading && !report ? 'Loading consumption' : 'No issued fabric in this selection.'}
                emptyAction={
                  !from && !to ? null : (
                    <button
                      type="button"
                      className="mt-2 font-semibold text-[rgb(132,90,223)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]"
                      onClick={() => replace({ from: '', to: '' })}
                    >
                      Show all dates
                    </button>
                  )
                }
              />
            </div>
            <div className={active ? 'block' : 'hidden lg:block'}>
              <ConsumptionDetail
                detail={detail}
                loading={detailLoading}
                error={detailError}
                active={active}
                showBack={Boolean(orderId)}
                onBack={() => replace({ order: '' })}
              />
            </div>
          </div>
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
