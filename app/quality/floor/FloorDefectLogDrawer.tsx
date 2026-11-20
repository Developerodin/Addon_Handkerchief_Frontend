'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { factoryRequest } from '@/shared/services/factoryApi';
import { UiButton } from '@/shared/components/ui';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';

interface DefectLogRow {
  id?: string;
  bundleBarcode?: string;
  orderNumber?: string;
  orderId?: string;
  phase?: string;
  arrivalQty?: number;
  m2Qty?: number;
  m4Qty?: number;
  inspectionGoodQty?: number;
  goodAddedQty?: number;
  passGoodQty?: number;
  articleLabel?: string;
  inspectedBy?: string;
  passedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

function formatWhen(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function phaseLabel(phase?: string) {
  if (phase === 'inspected') return 'Inspected';
  if (phase === 'passed') return 'Passed';
  return phase || '—';
}

/** Floor check defect log (bundle-check only). */
export function FloorDefectLogDrawer({
  open,
  onClose,
  orderId,
  orderNumber,
}: {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  orderNumber?: string;
}) {
  const [rows, setRows] = useState<DefectLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlyThisOrder, setOnlyThisOrder] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!open) return;
    if (!opts?.silent) setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ limit: '50', page: '1', kind: 'bundle-check' });
      if (onlyThisOrder && orderId) query.set('orderId', orderId);
      const data = await factoryRequest<{ results: DefectLogRow[]; total?: number }>(
        `/quality/floor/defect-logs?${query.toString()}`
      );
      setRows(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load defect log');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [open, onlyThisOrder, orderId]);

  useEffect(() => {
    if (!open) return;
    load().catch(() => undefined);
  }, [load, open]);

  useEffect(() => {
    if (!open) return;
    setOnlyThisOrder(Boolean(orderId));
  }, [open, orderId]);

  const subtitle = onlyThisOrder && orderNumber
    ? orderNumber
    : onlyThisOrder && orderId
      ? `Order …${orderId.slice(-6)}`
      : 'All orders · last 50 records';

  return (
    <FactoryDrawer
      open={open}
      wide
      title="Floor defect log"
      subtitle={subtitle}
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <UiButton type="button" variant="secondary" onClick={onClose}>
            Close
          </UiButton>
          <UiButton
            type="button"
            variant="primary"
            icon="ri-refresh-line"
            loading={loading}
            onClick={() => load({ silent: rows.length > 0 }).catch(() => undefined)}
          >
            Refresh
          </UiButton>
        </div>
      )}
    >
      <DrawerSection title="What this shows">
        <p className="text-[12px] leading-relaxed text-gray-600">
          Every <strong>inspection</strong> (M2/M4) and <strong>pass</strong> (good added, qty to next floor) with timestamp and
          operator. Piece moves between bundles offline are not listed — only totals QC entered.
        </p>
      </DrawerSection>

      <DrawerSection title="Filters">
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={onlyThisOrder}
            disabled={!orderId}
            onChange={(e) => setOnlyThisOrder(e.target.checked)}
          />
          {orderNumber ? `Only ${orderNumber}` : 'Only selected order'}
          {!orderId ? <span className="text-gray-400">(pick a bundle first)</span> : null}
        </label>
      </DrawerSection>

      <DrawerSection title="Records">
        {error ? (
          <p className="mb-2 text-[12px] text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {loading && !rows.length ? <p className="text-[12px] text-gray-500">Loading…</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse border border-gray-200 text-[11px]">
            <thead>
              <tr className="bg-gray-50/80">
                {['When', 'Bundle', 'Order', 'Article', 'Phase', 'Arrival', 'M2', 'M4', 'Insp. good', 'Added', 'Pass', 'By'].map((label) => (
                  <th key={label} className="border border-gray-200 px-1.5 py-2 text-left font-bold text-[#495057]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={String(row.id || `${row.bundleBarcode}-${row.updatedAt}`)} className="hover:bg-gray-50/50">
                    <td className="border border-gray-200 px-1.5 py-1.5 whitespace-nowrap text-gray-600">
                      {formatWhen(row.updatedAt || row.createdAt)}
                    </td>
                    <td className="border border-gray-200 px-1.5 py-1.5 font-mono font-semibold text-purple-700">{row.bundleBarcode || '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5">{row.orderNumber || '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5 max-w-[8rem] truncate" title={row.articleLabel}>
                      {row.articleLabel || '—'}
                    </td>
                    <td className="border border-gray-200 px-1.5 py-1.5">{phaseLabel(row.phase)}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5 text-center">{row.arrivalQty ?? '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5 text-center">{row.m2Qty ?? '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5 text-center">{row.m4Qty ?? '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5 text-center">{row.inspectionGoodQty ?? '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5 text-center">{row.goodAddedQty ?? '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5 text-center font-semibold text-gray-900">{row.passGoodQty ?? '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-1.5 text-[10px] text-gray-600">
                      {row.phase === 'passed' ? row.passedBy || row.inspectedBy : row.inspectedBy || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="border border-gray-200 py-12 text-center text-gray-400">
                    {loading ? 'Loading…' : 'No floor checks logged yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DrawerSection>
    </FactoryDrawer>
  );
}