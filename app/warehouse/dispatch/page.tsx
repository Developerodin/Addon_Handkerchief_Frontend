'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { dispatchStatusLabel } from '@/app/production/orders/orderLabels';
import { DispatchOrderDrawer, type DispatchOrderSummaryRow } from './DispatchOrderDrawer';

const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

interface ShipBox {
  id: string;
  barcode: string;
  orderNumber?: string;
  productionOrderId?: string;
  pieceQty: number;
  rackCode?: string;
  scaleWeight: number;
  bundleCount?: number;
}

interface OrderRackGroup {
  orderId: string;
  orderNumber: string;
  buyer?: string;
  targetQty: number;
  dispatchedQty: number;
  dispatchStatus: string;
  boxes: ShipBox[];
}

/**
 * Production-order-wise dispatch: boxes on rack grouped by order, challan print, partial / full ship.
 */
export default function DispatchPage() {
  const [rows, setRows] = useState<ShipBox[]>([]);
  const [byOrder, setByOrder] = useState<OrderRackGroup[]>([]);
  const [orders, setOrders] = useState<DispatchOrderSummaryRow[]>([]);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<ShipBox | null>(null);
  const [orderDrawerId, setOrderDrawerId] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);

  const load = useCallback(async () => {
    const [upcoming, summary] = await Promise.all([
      factoryRequest<{ results: ShipBox[]; byOrder?: OrderRackGroup[] }>('/warehouse/dispatch/upcoming'),
      factoryRequest<{ results: DispatchOrderSummaryRow[]; page?: number; totalPages?: number; totalResults?: number }>(
        `/warehouse/dispatch/orders?page=${orderPage}&limit=25`
      ),
    ]);
    setRows(upcoming.results || []);
    setByOrder(upcoming.byOrder || []);
    setOrders(summary.results || []);
    setOrderPages(summary.totalPages || 1);
    setOrderTotal(summary.totalResults ?? summary.results?.length ?? 0);
  }, [orderPage]);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load dispatch'));
  }, [load]);

  return (
    <RequireCrudPermission path="Packing & Dispatch / Dispatch" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Dispatch" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Dispatch</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{rows.length} on rack</span>
          </div>
          <p className="mb-4 text-[11px] text-gray-600">
            Boxes leave the factory against a <strong>production order</strong>. Order number is on the box label. Challan / note print works like GRN.
          </p>
          <form
            className="mb-4 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const match = rows.find((row) => row.barcode.toLowerCase() === scan.trim().toLowerCase());
              if (!match) setError('This box is not on a rack');
              else {
                setJob(match);
                setError('');
              }
              setScan('');
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="dsScan">
              Box barcode
            </label>
            <input
              id="dsScan"
              aria-label="Box barcode"
              className="w-48 rounded border border-gray-200 px-3 py-1.5 text-[11px]"
              value={scan}
              onChange={(event) => setScan(event.target.value)}
              required
            />
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">
              Open
            </button>
          </form>
          {error ? (
            <p className="mb-3 text-[12px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <h2 className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px] font-bold text-gray-800">
            <span>Production orders ({orderTotal})</span>
            {orderPages > 1 ? (
              <span className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                <button
                  type="button"
                  className="rounded border border-gray-200 px-2 py-0.5 disabled:opacity-40"
                  disabled={orderPage <= 1}
                  onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                Page {orderPage} / {orderPages}
                <button
                  type="button"
                  className="rounded border border-gray-200 px-2 py-0.5 disabled:opacity-40"
                  disabled={orderPage >= orderPages}
                  onClick={() => setOrderPage((p) => p + 1)}
                >
                  Next
                </button>
              </span>
            ) : null}
          </h2>
          <table className="mb-6 w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                {['Order', 'Buyer', 'Dispatch', 'On rack', 'Pipeline', 'Actions'].map((label) => (
                  <th key={label} className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase text-[#495057]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((row) => (
                  <tr key={row.orderId}>
                    <td className="border border-gray-200 px-1.5 py-2 text-[12px]">
                      <button type="button" className="font-mono font-bold text-purple-600" onClick={() => setOrderDrawerId(row.orderId)}>
                        {row.orderNumber}
                      </button>
                    </td>
                    <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.buyer || '—'}</td>
                    <td className="border border-gray-200 px-1.5 py-2 text-[12px]">
                      {row.dispatchedQty}/{row.targetQty} · {dispatchStatusLabel(row.dispatchStatus)}
                    </td>
                    <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.onRack ?? 0}</td>
                    <td className="border border-gray-200 px-1.5 py-2 text-[12px]">{row.pipeline ?? 0}</td>
                    <td className="border border-gray-200 px-1.5 py-2 text-[12px]">
                      <button type="button" className="text-[11px] font-bold text-purple-600" onClick={() => setOrderDrawerId(row.orderId)}>
                        View · Print
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border border-gray-200 py-10 text-center text-[11px] text-gray-400">
                    No production orders in the packing / dispatch pipeline yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h2 className="mb-2 text-[12px] font-bold text-gray-800">Boxes on rack (by order)</h2>
          {byOrder.length ? (
            <div className="space-y-4">
              {byOrder.map((group) => (
                <section key={group.orderId || group.orderNumber} className="rounded border border-gray-200">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-2 py-2">
                    <div>
                      <button
                        type="button"
                        className="text-[12px] font-bold text-purple-600"
                        onClick={() => group.orderId && setOrderDrawerId(group.orderId)}
                      >
                        {group.orderNumber}
                      </button>
                      <span className="ml-2 text-[11px] text-gray-600">
                        {group.dispatchedQty}/{group.targetQty} dispatched · {dispatchStatusLabel(group.dispatchStatus)}
                      </span>
                    </div>
                    {group.orderId ? (
                      <button type="button" className="text-[11px] font-bold text-purple-600" onClick={() => setOrderDrawerId(group.orderId)}>
                        Challan
                      </button>
                    ) : null}
                  </header>
                  <table className="w-full border-collapse">
                    <tbody>
                      {group.boxes.map((row) => (
                        <tr key={row.id}>
                          <td className="border-t border-gray-100 px-2 py-2 text-[12px]">
                            <button type="button" className="font-mono font-medium text-purple-600" onClick={() => setJob(row)}>
                              {row.barcode}
                            </button>
                          </td>
                          <td className="border-t border-gray-100 px-2 py-2 text-[12px]">{row.pieceQty} pcs</td>
                          <td className="border-t border-gray-100 px-2 py-2 text-[12px]">{row.scaleWeight} kg</td>
                          <td className="border-t border-gray-100 px-2 py-2 text-[12px]">{row.rackCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          ) : (
            <p className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">No box is on a rack.</p>
          )}
        </div>
        <ShipDrawer box={job} onClose={() => setJob(null)} onChanged={load} />
        {orderDrawerId ? (
          <DispatchOrderDrawer orderId={orderDrawerId} onClose={() => setOrderDrawerId('')} onChanged={load} />
        ) : null}
      </div>
    </RequireCrudPermission>
  );
}

function ShipDrawer({ box, onClose, onChanged }: { box: ShipBox | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const [vehicle, setVehicle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVehicle('');
    setError('');
  }, [box]);

  return (
    <FactoryDrawer title="Dispatch box" subtitle={box ? `${box.barcode}${box.orderNumber ? ` · ${box.orderNumber}` : ''}` : ''} open={Boolean(box)} onClose={onClose}>
      <DrawerSection title="Vehicle">
        {box?.orderNumber ? <p className="mb-2 text-[11px] text-gray-700">Production order {box.orderNumber}</p> : null}
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!box) return;
            setSaving(true);
            setError('');
            try {
              await factoryRequest('/warehouse/dispatch/ship', {
                method: 'POST',
                body: JSON.stringify({ boxBarcode: box.barcode, vehicleNumber: vehicle, eventId: `ship-${box.barcode}`, site: 'factory' }),
              });
              onClose();
              await onChanged();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Dispatch failed');
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="dsVehicle">
            Vehicle number
          </label>
          <input id="dsVehicle" aria-label="Vehicle number" className={fieldClass} value={vehicle} onChange={(event) => setVehicle(event.target.value)} required />
          {error ? (
            <p className="text-[12px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving}>
            Dispatch
          </button>
        </form>
      </DrawerSection>
    </FactoryDrawer>
  );
}