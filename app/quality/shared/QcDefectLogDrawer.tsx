'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { factoryRequest } from '@/shared/services/factoryApi';
import { UiButton } from '@/shared/components/ui';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';

interface DefectLogRow {
  id?: string;
  kind?: string;
  bundleBarcode?: string;
  orderNumber?: string;
  orderId?: string;
  phase?: string;
  arrivalQty?: number;
  m2Qty?: number;
  m4Qty?: number;
  defectQty?: number;
  inspectionGoodQty?: number;
  goodAddedQty?: number;
  passGoodQty?: number;
  articleLabel?: string;
  inspectedBy?: string;
  passedBy?: string;
  defectGrades?: { code: string; qty: number }[];
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

function kindLabel(kind?: string) {
  if (kind === 'final-qc') return 'Final QC';
  if (kind === 'final-checking') return 'Final checking';
  if (kind === 'bundle-check') return 'Floor check';
  return kind || 'QC';
}

export function QcDefectLogDrawer({
  open,
  onClose,
  orderId,
  orderNumber,
  title = 'Defect log',
  apiKind = 'bundle-check',
}: {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  orderNumber?: string;
  title?: string;
  apiKind?: 'bundle-check' | 'final-qc' | 'final-checking' | 'all';
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
      const query = new URLSearchParams({ limit: '50', page: '1', kind: apiKind });
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
  }, [open, onlyThisOrder, orderId, apiKind]);

  useEffect(() => {
    if (!open) return;
    load().catch(() => undefined);
  }, [load, open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      load({ silent: true }).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(id);
  }, [load, open]);

  return (
    <FactoryDrawer open={open} title={title} subtitle={orderNumber ? `Order ${orderNumber}` : 'Recent QC events'} onClose={onClose}>
      <DrawerSection title="Entries">
        <div className="grid gap-3 p-3">
          <label className="flex items-center gap-2 text-[11px] text-gray-700">
            <input type="checkbox" checked={onlyThisOrder} onChange={(e) => setOnlyThisOrder(e.target.checked)} />
            Only this order
          </label>
          <UiButton type="button" variant="secondary" icon="ri-refresh-line" loading={loading} onClick={() => load().catch(() => undefined)}>
            Refresh
          </UiButton>
          {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse border border-gray-200 text-[11px]">
              <thead>
                <tr className="bg-gray-50">
                  {['When', 'Bundle', 'Type', 'Phase', 'Arrival', 'Good', 'Added', 'Pass', 'Defects', 'By'].map((h) => (
                    <th key={h} className="border border-gray-200 px-1 py-1 text-left font-bold uppercase tracking-wide text-[#495057]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row, idx) => {
                    const defectText =
                      row.defectGrades?.length
                        ? row.defectGrades.map((g) => `${g.code} ${g.qty}`).join(', ')
                        : row.m2Qty != null || row.m4Qty != null
                          ? `m2 ${row.m2Qty || 0} m4 ${row.m4Qty || 0}`
                          : row.defectQty != null
                            ? String(row.defectQty)
                            : '—';
                    return (
                      <tr key={row.id || `${row.bundleBarcode}-${idx}`}>
                        <td className="border border-gray-200 px-1 py-1">{formatWhen(row.updatedAt || row.createdAt)}</td>
                        <td className="border border-gray-200 px-1 py-1 font-mono">{row.bundleBarcode || '—'}</td>
                        <td className="border border-gray-200 px-1 py-1">{kindLabel(row.kind)}</td>
                        <td className="border border-gray-200 px-1 py-1">{phaseLabel(row.phase)}</td>
                        <td className="border border-gray-200 px-1 py-1">{row.arrivalQty ?? '—'}</td>
                        <td className="border border-gray-200 px-1 py-1">{row.inspectionGoodQty ?? '—'}</td>
                        <td className="border border-gray-200 px-1 py-1">{row.goodAddedQty ?? '—'}</td>
                        <td className="border border-gray-200 px-1 py-1">{row.passGoodQty ?? '—'}</td>
                        <td className="border border-gray-200 px-1 py-1">{defectText}</td>
                        <td className="border border-gray-200 px-1 py-1">{row.passedBy || row.inspectedBy || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="border border-gray-200 py-8 text-center text-gray-400">
                      {loading ? 'Loading…' : 'No entries yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DrawerSection>
    </FactoryDrawer>
  );
}