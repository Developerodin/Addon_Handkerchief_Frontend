'use client';

import React, { useEffect, useState } from 'react';
import { factoryRequest } from '@/shared/services/factoryApi';
import { OrderLogPanel } from '@/shared/components/factory/OrderLogPanel';
import { downloadDispatchChallan, printDispatchChallan, type DispatchChallanBox } from './dispatchChallan';

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
}

interface DispatchPackDetail {
  order: DispatchOrderSummaryRow;
  onRack: DispatchChallanBox[];
  dispatched: DispatchChallanBox[];
  pipeline: DispatchChallanBox[];
}

export interface DispatchOrderDrawerProps {
  orderId: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

const dispatchTone = (status: string) => {
  if (status === 'complete') return 'bg-green-100 text-green-800';
  if (status === 'partial') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
};

/**
 * Order-wise dispatch detail: boxes on rack, pipeline, shipped — print challan / note like GRN.
 */
export function DispatchOrderDrawer({ orderId, onClose, onChanged }: DispatchOrderDrawerProps) {
  const [detail, setDetail] = useState<DispatchPackDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'print' | 'download' | 'note' | ''>('');
  const [shipBox, setShipBox] = useState<DispatchChallanBox | null>(null);
  const [vehicle, setVehicle] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'boxes' | 'activity'>('boxes');

  useEffect(() => {
    setDetail(null);
    setError('');
    setShipBox(null);
    setVehicle('');
    setTab('boxes');
    factoryRequest<DispatchPackDetail>(`/warehouse/dispatch/order/${orderId}`)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load dispatch detail'));
  }, [orderId]);

  const order = detail?.order;
  const printableOnRack = detail?.onRack || [];
  const allOpenPipeline = [...(detail?.pipeline || []), ...(detail?.onRack || [])];

  const output = async (mode: 'print' | 'download' | 'note') => {
    if (!order || busy) return;
    setBusy(mode === 'note' ? 'note' : mode);
    setError('');
    try {
      const boxes = mode === 'note' ? allOpenPipeline : [...printableOnRack, ...(detail?.dispatched || [])];
      const kind = mode === 'note' ? 'note' : 'challan';
      if (mode === 'download') downloadDispatchChallan(order, boxes, kind);
      else printDispatchChallan(order, boxes, kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print failed');
    } finally {
      setBusy('');
    }
  };

  const ship = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shipBox) return;
    setSaving(true);
    setError('');
    try {
      await factoryRequest('/warehouse/dispatch/ship', {
        method: 'POST',
        body: JSON.stringify({
          boxBarcode: shipBox.barcode,
          vehicleNumber: vehicle,
          eventId: `ship-${shipBox.barcode}`,
          site: 'factory',
        }),
      });
      setShipBox(null);
      setVehicle('');
      const fresh = await factoryRequest<DispatchPackDetail>(`/warehouse/dispatch/order/${orderId}`);
      setDetail(fresh);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setSaving(false);
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
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          {!order ? <p className="text-sm text-gray-500">Loading…</p> : null}
          {order ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1" role="tablist" aria-label="Dispatch sections">
                  {(['boxes', 'activity'] as const).map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={tab === name}
                      className={`rounded px-2 py-1 text-[11px] font-bold ${tab === name ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                      onClick={() => setTab(name)}
                    >
                      {name === 'boxes' ? 'Boxes' : 'Activity'}
                    </button>
                  ))}
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${dispatchTone(order.dispatchStatus)}`}>
                  {order.dispatchStatus}
                </span>
                <button
                  type="button"
                  className="rounded border border-gray-200 px-2 py-1 text-[11px] font-bold hover:bg-gray-50 disabled:opacity-50"
                  disabled={Boolean(busy)}
                  onClick={() => output('print')}
                >
                  {busy === 'print' ? 'Printing…' : 'Print challan'}
                </button>
                <button
                  type="button"
                  className="rounded border border-gray-200 px-2 py-1 text-[11px] font-bold hover:bg-gray-50 disabled:opacity-50"
                  disabled={Boolean(busy)}
                  onClick={() => output('note')}
                >
                  {busy === 'note' ? 'Printing…' : 'Print note'}
                </button>
                <button
                  type="button"
                  className="rounded border border-gray-200 px-2 py-1 text-[11px] font-bold hover:bg-gray-50 disabled:opacity-50"
                  disabled={Boolean(busy)}
                  onClick={() => output('download')}
                >
                  {busy === 'download' ? 'Saving…' : 'Download'}
                </button>
              </div>
              {tab === 'boxes' ? (
                <>
                  <Section title={`On rack (${printableOnRack.length})`} rows={printableOnRack} onShip={setShipBox} shipActive={shipBox?.barcode} />
                  <Section title={`Pipeline (${detail?.pipeline.length || 0})`} rows={detail?.pipeline || []} />
                  <Section title={`Shipped (${detail?.dispatched.length || 0})`} rows={detail?.dispatched || []} />
                </>
              ) : (
                <div className="rounded border border-gray-200 p-3">
                  <p className="mb-2 text-[11px] font-bold text-gray-800">Order activity (packing, box, dispatch)</p>
                  <OrderLogPanel orderId={orderId} />
                </div>
              )}
            </>
          ) : null}
        </div>
        {shipBox ? (
          <footer className="mt-auto border-t border-gray-200 p-4">
            <p className="mb-2 text-[11px] font-bold text-gray-800">Ship {shipBox.barcode}</p>
            <form className="flex flex-wrap items-end gap-2" onSubmit={ship}>
              <label className="grid gap-1 text-[11px] font-bold text-gray-700" htmlFor="dispatch-vehicle">
                Vehicle number
                <input
                  id="dispatch-vehicle"
                  className="w-48 rounded border border-gray-200 px-3 py-1.5 text-[11px]"
                  value={vehicle}
                  onChange={(event) => setVehicle(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving}>
                Dispatch box
              </button>
              <button type="button" className="rounded border border-gray-200 px-3 py-1.5 text-[11px] font-bold" onClick={() => setShipBox(null)}>
                Cancel
              </button>
            </form>
          </footer>
        ) : null}
      </aside>
    </>
  );
}

function Section({
  title,
  rows,
  onShip,
  shipActive,
}: {
  title: string;
  rows: DispatchChallanBox[];
  onShip?: (row: DispatchChallanBox) => void;
  shipActive?: string;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-bold text-gray-800">{title}</h3>
      <table className="w-full border-collapse border border-gray-200 text-[11px]">
        <thead>
          <tr className="bg-gray-50">
            {['Box', 'Bundles', 'Pcs', 'Kg', 'Rack', onShip ? '' : null].filter(Boolean).map((label) => (
              <th key={String(label)} className="border border-gray-200 px-1.5 py-2 text-left font-bold uppercase text-gray-600">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.barcode} className={shipActive === row.barcode ? 'bg-purple-50' : undefined}>
                <td className="border border-gray-200 px-1.5 py-2 font-mono">{row.barcode}</td>
                <td className="border border-gray-200 px-1.5 py-2">{row.bundleCount}</td>
                <td className="border border-gray-200 px-1.5 py-2">{row.pieceQty}</td>
                <td className="border border-gray-200 px-1.5 py-2">{row.scaleWeight || '—'}</td>
                <td className="border border-gray-200 px-1.5 py-2">{row.rackCode || '—'}</td>
                {onShip ? (
                  <td className="border border-gray-200 px-1.5 py-2">
                    <button type="button" className="font-bold text-purple-600" onClick={() => onShip(row)}>
                      Ship
                    </button>
                  </td>
                ) : null}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={onShip ? 6 : 5} className="border border-gray-200 py-8 text-center text-gray-400">
                None
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}