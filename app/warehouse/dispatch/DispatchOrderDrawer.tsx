'use client';

import React, { useEffect, useState } from 'react';
import { factoryRequest } from '@/shared/services/factoryApi';
import { OrderLogPanel } from '@/shared/components/factory/OrderLogPanel';
import { downloadDispatchChallan, printDispatchChallan, printShipmentBatchChallanById, type DispatchChallanBox } from './dispatchChallan';
import type { DispatchShipmentDetail } from './DispatchShipmentDrawer';

export interface DispatchOrderSummaryRow {
  orderId: string;
  orderNumber: string;
  buyer?: string;
  targetQty: number;
  dispatchedQty: number;
  dispatchStatus: string;
  onRack?: number;
  pipeline?: number;
  boxCount?: number;
  openShipmentId?: string;
  openShipmentCode?: string;
  draftBoxCount?: number;
  dispatchTrackingClosedAt?: string | null;
}

interface DispatchPackDetail {
  order: DispatchOrderSummaryRow;
  onRack: DispatchChallanBox[];
  dispatched: DispatchChallanBox[];
  pipeline: DispatchChallanBox[];
  shipments: DispatchShipmentDetail[];
  openShipment: DispatchShipmentDetail | null;
}

export interface DispatchOrderDrawerProps {
  orderId: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onOpenShipment: (shipmentId: string) => void;
  onStartDispatch: (productionOrderId: string) => void;
}

const dispatchTone = (status: string) => {
  if (status === 'complete') return 'bg-green-100 text-green-800';
  if (status === 'partial') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
};

/**
 * Order-wise dispatch detail: boxes on rack, pipeline, shipped batches — print challan per batch.
 */
export function DispatchOrderDrawer({ orderId, onClose, onChanged, onOpenShipment, onStartDispatch }: DispatchOrderDrawerProps) {
  const [detail, setDetail] = useState<DispatchPackDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<'boxes' | 'batches' | 'activity'>('boxes');

  const reload = async () => {
    const fresh = await factoryRequest<DispatchPackDetail>(`/warehouse/dispatch/order/${orderId}`);
    setDetail(fresh);
    return fresh;
  };

  useEffect(() => {
    setDetail(null);
    setError('');
    setTab('boxes');
    factoryRequest<DispatchPackDetail>(`/warehouse/dispatch/order/${orderId}`)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load dispatch detail'));
  }, [orderId]);

  const order = detail?.order;

  const printShipment = (shipment: DispatchShipmentDetail) => {
    printShipmentBatchChallanById(shipment).catch((err) => setError(err instanceof Error ? err.message : 'Print failed'));
  };

  const closeTracking = async () => {
    if (!order) return;
    const onRack = detail?.onRack.length || 0;
    const msg =
      onRack > 0
        ? `${onRack} box(es) are still on rack. Mark dispatch complete for this order anyway?`
        : 'Mark dispatch tracking complete for this order?';
    if (!window.confirm(msg)) return;
    setBusy('close');
    setError('');
    try {
      await factoryRequest(`/warehouse/dispatch/order/${orderId}/close-tracking`, { method: 'POST' });
      await reload();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close tracking');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl" aria-label="Dispatch order">
        <header className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800">{order?.orderNumber || 'Production order'}</h2>
            {order ? (
              <p className="text-[11px] text-gray-600">
                {order.buyer || '—'} · {order.dispatchedQty}/{order.targetQty} pcs dispatched
              </p>
            ) : null}
          </div>
          <button type="button" className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Close" onClick={onClose}>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>
        <div className="space-y-4 p-4">
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {!order ? <p className="text-sm text-gray-500">Loading…</p> : null}
          {order ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1" role="tablist" aria-label="Dispatch sections">
                  {(['boxes', 'batches', 'activity'] as const).map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={tab === name}
                      className={`rounded px-2 py-1 text-[11px] font-bold ${tab === name ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                      onClick={() => setTab(name)}
                    >
                      {name === 'boxes' ? 'Boxes' : name === 'batches' ? 'Batches' : 'Activity'}
                    </button>
                  ))}
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${dispatchTone(order.dispatchStatus)}`}>
                  {order.dispatchStatus}
                </span>
                {detail?.openShipment ? (
                  <button type="button" className="rounded border border-purple-200 px-2 py-1 text-[11px] font-bold text-purple-600" onClick={() => onOpenShipment(detail.openShipment!.id)}>
                    Open {detail.openShipment.shipmentCode}
                  </button>
                ) : (
                  <button type="button" className="rounded bg-purple-600 px-2 py-1 text-[11px] font-bold text-white" onClick={() => onStartDispatch(orderId)}>
                    New dispatch
                  </button>
                )}
                {!order.dispatchTrackingClosedAt ? (
                  <button
                    type="button"
                    className="rounded border border-gray-200 px-2 py-1 text-[11px] font-bold hover:bg-gray-50 disabled:opacity-50"
                    disabled={Boolean(busy)}
                    onClick={closeTracking}
                  >
                    {busy === 'close' ? 'Saving…' : 'Mark dispatch complete'}
                  </button>
                ) : (
                  <span className="text-[10px] font-bold uppercase text-gray-500">Tracking closed</span>
                )}
                <button
                  type="button"
                  className="rounded border border-gray-200 px-2 py-1 text-[11px] font-bold hover:bg-gray-50"
                  onClick={() => {
                    const allOpen = [...(detail?.pipeline || []), ...(detail?.onRack || [])];
                    downloadDispatchChallan(order, allOpen).catch((err) =>
                      setError(err instanceof Error ? err.message : 'Download failed')
                    );
                  }}
                >
                  Download note
                </button>
              </div>
              {tab === 'boxes' ? (
                <>
                  <Section title={`On rack (${detail?.onRack.length || 0})`} rows={detail?.onRack || []} />
                  <Section title={`Pipeline (${detail?.pipeline.length || 0})`} rows={detail?.pipeline || []} />
                  <Section title={`Shipped boxes (${detail?.dispatched.length || 0})`} rows={detail?.dispatched || []} />
                </>
              ) : null}
              {tab === 'batches' ? (
                <section>
                  <h3 className="mb-2 text-[12px] font-bold text-gray-800">Dispatched batches</h3>
                  <table className="w-full border-collapse border border-gray-200 text-[11px]">
                    <thead>
                      <tr className="bg-gray-50">
                        {['Code', 'Boxes', 'Pcs', 'Vehicle', ''].map((label) => (
                          <th key={label} className="border border-gray-200 px-1.5 py-2 text-left font-bold uppercase text-gray-600">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.shipments.length ? (
                        detail.shipments.map((row) => (
                          <tr key={row.id}>
                            <td className="border border-gray-200 px-1.5 py-2 font-mono">{row.shipmentCode}</td>
                            <td className="border border-gray-200 px-1.5 py-2">{row.boxCount}</td>
                            <td className="border border-gray-200 px-1.5 py-2">{row.pieceQty}</td>
                            <td className="border border-gray-200 px-1.5 py-2">{row.vehicleNumber || '—'}</td>
                            <td className="border border-gray-200 px-1.5 py-2">
                              <button
                                type="button"
                                className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-white"
                                aria-label={`Print challan ${row.shipmentCode}`}
                                onClick={() => printShipment(row)}
                              >
                                Print
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="border border-gray-200 py-8 text-center text-gray-400">
                            No dispatched batches yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>
              ) : null}
              {tab === 'activity' ? (
                <div className="rounded border border-gray-200 p-3">
                  <p className="mb-2 text-[11px] font-bold text-gray-800">Order activity (packing, box, dispatch)</p>
                  <OrderLogPanel orderId={orderId} />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function Section({ title, rows }: { title: string; rows: DispatchChallanBox[] }) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-bold text-gray-800">{title}</h3>
      <table className="w-full border-collapse border border-gray-200 text-[11px]">
        <thead>
          <tr className="bg-gray-50">
            {['Box', 'Bundles', 'Pcs', 'Kg', 'Rack'].map((label) => (
              <th key={label} className="border border-gray-200 px-1.5 py-2 text-left font-bold uppercase text-gray-600">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.barcode}>
                <td className="border border-gray-200 px-1.5 py-2 font-mono">{row.barcode}</td>
                <td className="border border-gray-200 px-1.5 py-2">{row.bundleCount}</td>
                <td className="border border-gray-200 px-1.5 py-2">{row.pieceQty}</td>
                <td className="border border-gray-200 px-1.5 py-2">{row.scaleWeight || '—'}</td>
                <td className="border border-gray-200 px-1.5 py-2">{row.rackCode || '—'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="border border-gray-200 py-8 text-center text-gray-400">
                None
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}