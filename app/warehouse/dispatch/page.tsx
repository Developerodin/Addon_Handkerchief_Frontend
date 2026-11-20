'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { factoryRequest } from '@/shared/services/factoryApi';
import { dispatchStatusLabel } from '@/app/production/orders/orderLabels';
import { DispatchOrderDrawer, type DispatchOrderSummaryRow } from './DispatchOrderDrawer';
import {
  DispatchShipmentDrawer,
  openDispatchShipmentForOrder,
  type DispatchShipmentDetail,
} from './DispatchShipmentDrawer';
import { downloadShipmentBatchChallan, printShipmentBatchChallanById } from './dispatchChallan';

type DispatchTab = 'work' | 'orders' | 'rack' | 'history';

const TABS: { id: DispatchTab; label: string; hint: string }[] = [
  { id: 'work', label: 'Scan & ship', hint: 'Continue an open batch — scan boxes, then dispatch the truck.' },
  { id: 'orders', label: 'Orders', hint: 'Start a new dispatch batch or open order details.' },
  { id: 'rack', label: 'On rack', hint: 'Boxes sitting on racks, grouped by production order.' },
  {
    id: 'history',
    label: 'History',
    hint: 'Past dispatches — see vehicle, boxes per batch, reprint delivery challan. Tax invoice is separate (Accounts).',
  },
];

function formatDispatchWhen(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

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

const th = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase text-[#495057]';
const td = 'border border-gray-200 px-1.5 py-2 text-[12px]';

/**
 * Tab-based dispatch: Scan & ship → Orders → On rack.
 */
export default function DispatchPage() {
  const [tab, setTab] = useState<DispatchTab>('work');
  const [rows, setRows] = useState<ShipBox[]>([]);
  const [byOrder, setByOrder] = useState<OrderRackGroup[]>([]);
  const [orders, setOrders] = useState<DispatchOrderSummaryRow[]>([]);
  const [draftShipments, setDraftShipments] = useState<DispatchShipmentDetail[]>([]);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [orderDrawerId, setOrderDrawerId] = useState('');
  const [shipmentDrawerId, setShipmentDrawerId] = useState('');
  const [autoScanBarcode, setAutoScanBarcode] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [historyRows, setHistoryRows] = useState<DispatchShipmentDetail[]>([]);
  const [historyQ, setHistoryQ] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const qs = new URLSearchParams({
        status: 'dispatched',
        page: String(historyPage),
        limit: '25',
      });
      if (historyQ.trim()) qs.set('q', historyQ.trim());
      const data = await factoryRequest<{
        results: DispatchShipmentDetail[];
        totalPages?: number;
        totalResults?: number;
      }>(`/warehouse/dispatch/shipments?${qs.toString()}`);
      setHistoryRows(data.results || []);
      setHistoryPages(data.totalPages || 1);
      setHistoryTotal(data.totalResults ?? data.results?.length ?? 0);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyQ]);

  const load = useCallback(async () => {
    const [upcoming, summary, drafts] = await Promise.all([
      factoryRequest<{ results: ShipBox[]; byOrder?: OrderRackGroup[] }>('/warehouse/dispatch/upcoming'),
      factoryRequest<{ results: DispatchOrderSummaryRow[]; page?: number; totalPages?: number; totalResults?: number }>(
        `/warehouse/dispatch/orders?page=${orderPage}&limit=25`
      ),
      factoryRequest<{ results: DispatchShipmentDetail[] }>('/warehouse/dispatch/shipments?status=draft'),
    ]);
    setRows(upcoming.results || []);
    setByOrder(upcoming.byOrder || []);
    setOrders(summary.results || []);
    setOrderPages(summary.totalPages || 1);
    setOrderTotal(summary.totalResults ?? summary.results?.length ?? 0);
    setDraftShipments(drafts.results || []);
  }, [orderPage]);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load dispatch'));
  }, [load]);

  useEffect(() => {
    if (tab !== 'history') return;
    loadHistory().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load history'));
  }, [tab, loadHistory]);

  const openShipmentForWork = (id: string, barcode?: string) => {
    setAutoScanBarcode(barcode || '');
    setShipmentDrawerId(id);
    setTab('work');
  };

  const openShipmentHistory = (id: string) => {
    setAutoScanBarcode('');
    setShipmentDrawerId(id);
  };

  const startDispatchForOrder = async (productionOrderId: string, barcode?: string) => {
    setError('');
    try {
      const draft = await openDispatchShipmentForOrder(productionOrderId);
      await load();
      openShipmentForWork(draft.id, barcode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open dispatch batch');
    }
  };

  const onScanSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = scan.trim();
    if (!code) return;
    const match = rows.find((row) => row.barcode.toLowerCase() === code.toLowerCase());
    setScan('');
    if (!match?.productionOrderId) {
      setError('This box is not on a rack. Check the On rack tab or Boxes screen.');
      return;
    }
    setError('');
    const existing = draftShipments.find((row) => row.productionOrderId === match.productionOrderId);
    if (existing) openShipmentForWork(existing.id, match.barcode);
    else await startDispatchForOrder(match.productionOrderId, match.barcode);
  };

  const activeHint = TABS.find((row) => row.id === tab)?.hint ?? '';

  return (
    <RequireCrudPermission path="Packing & Dispatch / Dispatch" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Dispatch" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Dispatch</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{rows.length} on rack</span>
            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">{draftShipments.length} open batch</span>
          </div>

          <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Dispatch sections">
            {TABS.map((row) => {
              const count =
                row.id === 'work'
                  ? draftShipments.length
                  : row.id === 'rack'
                    ? rows.length
                    : row.id === 'history'
                      ? historyTotal
                      : orderTotal;
              const on = tab === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={
                    on
                      ? 'rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white'
                      : 'rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50'
                  }
                  onClick={() => {
                    setTab(row.id);
                    setError('');
                  }}
                >
                  {row.label}
                  {count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
          <p className="mb-4 text-[11px] text-gray-600">{activeHint}</p>
          {error ? (
            <p className="mb-3 text-[12px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {tab === 'work' ? (
            <section aria-labelledby="dispatch-work-heading">
              <h2 id="dispatch-work-heading" className="sr-only">
                Scan and ship
              </h2>
              <ol className="mb-4 list-decimal space-y-1 pl-5 text-[11px] text-gray-700">
                <li>Scan a box below (or start from the <button type="button" className="font-bold text-purple-600" onClick={() => setTab('orders')}>Orders</button> tab).</li>
                <li>Open the batch and scan every box going on the truck.</li>
                <li>Enter vehicle number → <strong>Dispatch batch</strong> → print challan.</li>
              </ol>
              <form className="mb-5 flex flex-wrap items-end gap-2 rounded border border-purple-100 bg-purple-50/40 p-3" onSubmit={onScanSubmit}>
                <label className="text-[11px] font-bold text-[#495057]" htmlFor="dsScan">
                  Scan box barcode
                </label>
                <input
                  id="dsScan"
                  aria-label="Box barcode"
                  className="w-56 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px]"
                  value={scan}
                  onChange={(event) => setScan(event.target.value)}
                  autoComplete="off"
                />
                <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">
                  Add to batch
                </button>
              </form>

              <h3 className="mb-2 text-[12px] font-bold text-gray-800">Open batches — tap Open to continue</h3>
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    {['Batch', 'Order', 'Boxes', 'Pcs', ''].map((label) => (
                      <th key={label || 'act'} className={th}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draftShipments.length ? (
                    draftShipments.map((row) => (
                      <tr key={row.id}>
                        <td className={`${td} font-mono font-bold text-purple-600`}>{row.shipmentCode}</td>
                        <td className={td}>
                          {row.orderNumber}
                          {row.buyer ? <span className="ml-1 text-gray-500">· {row.buyer}</span> : null}
                        </td>
                        <td className={td}>{row.boxCount}</td>
                        <td className={td}>{row.pieceQty}</td>
                        <td className={td}>
                          <button type="button" className="rounded bg-purple-600 px-2 py-1 text-[11px] font-bold text-white" onClick={() => openShipmentForWork(row.id)}>
                            Open
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-gray-200 py-10 text-center text-[11px] text-gray-500">
                        No open batch. Go to <button type="button" className="font-bold text-purple-600" onClick={() => setTab('orders')}>Orders</button> and
                        tap <strong>New dispatch</strong>, or scan a box above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          ) : null}

          {tab === 'orders' ? (
            <section aria-labelledby="dispatch-orders-heading">
              <h2 id="dispatch-orders-heading" className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px] font-bold text-gray-800">
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
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    {['Order', 'Buyer', 'Shipped', 'On rack', ''].map((label) => (
                      <th key={label || 'act'} className={th}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length ? (
                    orders.map((row) => (
                      <tr key={row.orderId}>
                        <td className={td}>
                          <button type="button" className="font-mono font-bold text-purple-600" onClick={() => setOrderDrawerId(row.orderId)}>
                            {row.orderNumber}
                          </button>
                        </td>
                        <td className={td}>{row.buyer || '—'}</td>
                        <td className={td}>
                          {row.dispatchedQty}/{row.targetQty} · {dispatchStatusLabel(row.dispatchStatus)}
                        </td>
                        <td className={td}>{row.onRack ?? 0}</td>
                        <td className={td}>
                          <button type="button" className="mr-2 text-[11px] font-bold text-gray-600" onClick={() => setOrderDrawerId(row.orderId)}>
                            Details
                          </button>
                          <button
                            type="button"
                            className="text-[11px] font-bold text-purple-600"
                            onClick={() => {
                              if (row.openShipmentId) openShipmentForWork(row.openShipmentId);
                              else startDispatchForOrder(row.orderId);
                            }}
                          >
                            {row.openShipmentId ? 'Continue batch' : 'New dispatch'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-gray-200 py-10 text-center text-[11px] text-gray-400">
                        No orders waiting for dispatch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          ) : null}

          {tab === 'rack' ? (
            <section aria-labelledby="dispatch-rack-heading">
              <h2 id="dispatch-rack-heading" className="mb-2 text-[12px] font-bold text-gray-800">
                Boxes on rack ({rows.length})
              </h2>
              {byOrder.length ? (
                <div className="space-y-3">
                  {byOrder.map((group) => (
                    <article key={group.orderId || group.orderNumber} className="rounded border border-gray-200">
                      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                        <div>
                          <span className="text-[12px] font-bold text-gray-800">{group.orderNumber}</span>
                          <span className="ml-2 text-[11px] text-gray-600">
                            {group.dispatchedQty}/{group.targetQty} dispatched · {group.boxes.length} box(es)
                          </span>
                        </div>
                        {group.orderId ? (
                          <button
                            type="button"
                            className="rounded border border-purple-200 px-2 py-0.5 text-[11px] font-bold text-purple-600"
                            onClick={() => startDispatchForOrder(group.orderId)}
                          >
                            Dispatch this order
                          </button>
                        ) : null}
                      </header>
                      <ul className="divide-y divide-gray-100 px-3 py-1">
                        {group.boxes.map((row) => (
                          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12px]">
                            <span className="font-mono font-medium">{row.barcode}</span>
                            <span className="text-gray-600">
                              {row.pieceQty} pcs · {row.scaleWeight} kg · {row.rackCode}
                            </span>
                            {group.orderId ? (
                              <button
                                type="button"
                                className="text-[11px] font-bold text-purple-600"
                                onClick={() => startDispatchForOrder(group.orderId, row.barcode)}
                              >
                                Scan to batch
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">No box is on a rack.</p>
              )}
            </section>
          ) : null}

          {tab === 'history' ? (
            <section aria-labelledby="dispatch-history-heading">
              <h2 id="dispatch-history-heading" className="mb-2 text-[12px] font-bold text-gray-800">
                Dispatched batches ({historyTotal})
              </h2>
              <form
                className="mb-3 flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setHistoryPage(1);
                  loadHistory().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Search failed'));
                }}
              >
                <label className="grid gap-1 text-[11px] font-bold text-gray-700" htmlFor="history-q">
                  Search order, batch, or vehicle
                  <input
                    id="history-q"
                    className="w-64 rounded border border-gray-200 px-3 py-1.5 text-[11px]"
                    value={historyQ}
                    onChange={(event) => setHistoryQ(event.target.value)}
                    placeholder="ORD-000001, DSP-000003, RJ14…"
                  />
                </label>
                <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">
                  Search
                </button>
              </form>
              {historyPages > 1 ? (
                <div className="mb-2 flex items-center gap-2 text-[11px] text-gray-600">
                  <button
                    type="button"
                    className="rounded border border-gray-200 px-2 py-0.5 disabled:opacity-40"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  Page {historyPage} / {historyPages}
                  <button
                    type="button"
                    className="rounded border border-gray-200 px-2 py-0.5 disabled:opacity-40"
                    disabled={historyPage >= historyPages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    {['When', 'Batch', 'Order', 'Vehicle', 'Boxes', 'Pcs', ''].map((label) => (
                      <th key={label || 'act'} className={th}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-200 py-10 text-center text-[11px] text-gray-500">
                        Loading…
                      </td>
                    </tr>
                  ) : historyRows.length ? (
                    historyRows.map((row) => (
                      <React.Fragment key={row.id}>
                        <tr>
                          <td className={td}>{formatDispatchWhen(row.dispatchedAt)}</td>
                          <td className={`${td} font-mono font-bold text-purple-600`}>{row.shipmentCode}</td>
                          <td className={td}>
                            {row.orderNumber}
                            {row.buyer ? <span className="block text-[10px] text-gray-500">{row.buyer}</span> : null}
                          </td>
                          <td className={td}>{row.vehicleNumber || '—'}</td>
                          <td className={td}>{row.boxCount}</td>
                          <td className={td}>{row.pieceQty}</td>
                          <td className={td}>
                            <button type="button" className="mr-2 text-[11px] font-bold text-gray-700" onClick={() => openShipmentHistory(row.id)}>
                              View
                            </button>
                            <button
                              type="button"
                              className="mr-2 rounded bg-primary px-2 py-1 text-[10px] font-bold text-white"
                              aria-label={`Print challan ${row.shipmentCode}`}
                              onClick={() => {
                                printShipmentBatchChallanById(row).catch((err: unknown) =>
                                  setError(err instanceof Error ? err.message : 'Print failed')
                                );
                              }}
                            >
                              Print
                            </button>
                            <button
                              type="button"
                              className="rounded border border-gray-300 px-2 py-1 text-[10px] font-bold text-gray-700"
                              onClick={() =>
                                downloadShipmentBatchChallan(row).catch((err: unknown) =>
                                  setError(err instanceof Error ? err.message : 'Download failed')
                                )
                              }
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                        <tr className="bg-gray-50/50">
                          <td colSpan={7} className="border border-gray-200 px-2 py-1.5 text-[10px] text-gray-600">
                            Boxes:{' '}
                            {row.boxLines.length
                              ? row.boxLines.map((line) => `${line.boxBarcode} (${line.pieceQty} pcs)`).join(' · ')
                              : '—'}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="border border-gray-200 py-10 text-center text-[11px] text-gray-400">
                        No dispatched batches yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
        {shipmentDrawerId ? (
          <DispatchShipmentDrawer
            shipmentId={shipmentDrawerId}
            autoScanBarcode={autoScanBarcode}
            onClose={() => {
              setShipmentDrawerId('');
              setAutoScanBarcode('');
            }}
            onChanged={load}
          />
        ) : null}
        {orderDrawerId ? (
          <DispatchOrderDrawer
            orderId={orderDrawerId}
            onClose={() => setOrderDrawerId('')}
            onChanged={load}
            onOpenShipment={(id) => openShipmentForWork(id)}
            onStartDispatch={(orderId) => startDispatchForOrder(orderId)}
          />
        ) : null}
      </div>
    </RequireCrudPermission>
  );
}