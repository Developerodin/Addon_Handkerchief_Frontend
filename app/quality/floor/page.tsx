'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CompletedQueueTable, CompletedRow } from '@/app/production/floor/shared/CompletedQueueTable';
import { QueueTab, QueueTabs } from '@/app/production/floor/shared/QueueTabs';
import { BundleRow, factoryPage, factoryRequest, ProductionOrderRow, RollRow } from '@/shared/services/factoryApi';
import { listProductionRacks, ProductionRack } from '@/shared/services/phase3CatalogService';
import { UiButton } from '@/shared/components/ui';
import { FloorDefectLogDrawer } from './FloorDefectLogDrawer';

interface UpcomingBundle {
  id: string;
  barcode: string;
  orderId: string;
  orderNumber: string;
  qty: number;
  arrivalQty?: number;
  rackCode: string;
  floorInspected?: boolean;
  m2Qty?: number;
  m4Qty?: number;
  inspectionGoodQty?: number;
  articleLabel?: string;
  readyForHorizontalHem?: boolean;
  blockers?: string[];
}

interface BundleCheckSaveResult {
  bundleBarcode?: string;
  rackCode?: string;
  readyForHorizontalHem?: boolean;
  passGoodQty?: number;
  goodAddedQty?: number;
  inspectionGoodQty?: number;
  arrivalQty?: number;
  m2Qty?: number;
  m4Qty?: number;
}

interface FloorCheckBoard {
  results: UpcomingBundle[];
  awaitingPass?: UpcomingBundle[];
  pendingPlacement?: UpcomingBundle[];
  received?: UpcomingBundle[];
  completed?: CompletedRow[];
  counts?: {
    waiting?: number;
    inspectNow?: number;
    awaitingPass?: number;
    pendingPlacement?: number;
    received?: number;
    completed?: number;
  };
}

type Step = 'pick' | 'inspect' | 'pass' | 'done';

const fieldClass =
  'box-border h-9 w-full rounded border border-gray-200 bg-white px-3 text-[12px] font-medium text-gray-900 outline-none focus:border-purple-400';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#495057]';

function BundleTable({
  rows,
  emptyText,
  onPick,
  showHandoffStatus,
}: {
  rows: UpcomingBundle[];
  emptyText: string;
  onPick?: (row: UpcomingBundle) => void;
  showHandoffStatus?: boolean;
}) {
  const headers = showHandoffStatus ? ['Bundle', 'Order', 'Qty', 'Rack', 'Next step'] : ['Bundle', 'Order', 'Qty', 'Rack'];
  return (
    <table className="w-full border-collapse border border-gray-200">
      <thead>
        <tr className="bg-gray-50/30">
          {headers.map((label) => (
            <th key={label} className="border border-gray-200 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#495057]">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50/50">
              <td className="border border-gray-200 px-2 py-2 text-[12px]">
                {onPick ? (
                  <button type="button" className="font-mono font-semibold text-purple-600 hover:text-purple-700" onClick={() => onPick(row)}>
                    {row.barcode}
                  </button>
                ) : (
                  <span className="font-mono text-gray-900">{row.barcode}</span>
                )}
              </td>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">{row.orderNumber || row.orderId.slice(-6)}</td>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">{row.qty}</td>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">{row.rackCode || '—'}</td>
              {showHandoffStatus ? (
                <td className="border border-gray-200 px-2 py-2 text-[11px]">
                  {row.readyForHorizontalHem ? (
                    <Link href="/production/floor/horizontal-hem" className="font-semibold text-emerald-700 underline">
                      Ready → Horizontal hemming
                    </Link>
                  ) : (
                    <span className="text-amber-800">{(row.blockers && row.blockers.length ? row.blockers : ['Fix single piece steps']).join(' · ')}</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={showHandoffStatus ? 5 : 4} className="border border-gray-200 py-12 text-center text-[11px] text-gray-400">
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/**
 * Floor bundle check after single piece cutting. One step at a time: pick bundle, then counts, then next stage hint.
 */
export default function FloorChecksPage() {
  const [orderRows, setOrderRows] = useState<ProductionOrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [step, setStep] = useState<Step>('pick');
  const [selected, setSelected] = useState<UpcomingBundle | null>(null);
  const [bundleId, setBundleId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orderBundles, setOrderBundles] = useState<BundleRow[]>([]);
  const [m2Qty, setM2Qty] = useState('');
  const [m4Qty, setM4Qty] = useState('0');
  const [goodAdded, setGoodAdded] = useState('0');
  const [passQty, setPassQty] = useState('');
  const [passQtyTouched, setPassQtyTouched] = useState(false);
  const [inspectionGood, setInspectionGood] = useState(0);
  const [showDefectLog, setShowDefectLog] = useState(false);
  const [scan, setScan] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState<FloorCheckBoard>({ results: [], pendingPlacement: [], received: [] });
  const [showReject, setShowReject] = useState(false);
  const [rollBarcode, setRollBarcode] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [racks, setRacks] = useState<ProductionRack[]>([]);
  const [lastSave, setLastSave] = useState<BundleCheckSaveResult | null>(null);
  const [queueTab, setQueueTab] = useState<QueueTab>('upcoming');
  const [showFlowHelp, setShowFlowHelp] = useState(false);
  const [boardLoading, setBoardLoading] = useState(true);

  const loadUpcoming = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setBoardLoading(true);
    try {
      const data = await factoryRequest<FloorCheckBoard>('/quality/floor/upcoming');
      setBoard({
        results: data.results || [],
        awaitingPass: data.awaitingPass || [],
        pendingPlacement: data.pendingPlacement || [],
        received: data.received || [],
        completed: data.completed || [],
        counts: {
          ...(data.counts || {}),
          completed: data.counts?.completed ?? (data.completed?.length || 0),
        },
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bundles');
    } finally {
      if (!opts?.silent) setBoardLoading(false);
    }
  }, []);

  const ensureOrderPicklist = useCallback(async () => {
    if (orderRows.length || ordersLoading) return;
    setOrdersLoading(true);
    try {
      const data = await factoryPage<ProductionOrderRow>('/production/orders', 1, 100, '', { picklist: '1' });
      setOrderRows(data.results || []);
    } catch {
      setOrderRows([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [orderRows.length, ordersLoading]);

  useEffect(() => {
    loadUpcoming().catch(() => undefined);
  }, [loadUpcoming]);

  useEffect(() => {
    if (!showReject) return;
    listProductionRacks({ limit: 50, page: 1 })
      .then((data) => setRacks(data.results || []))
      .catch(() => undefined);
    factoryRequest<{ results: RollRow[] }>('/store/rolls?limit=50')
      .then((data) => setRolls(data.results || []))
      .catch(() => undefined);
  }, [showReject]);

  const arrivalQty = selected?.arrivalQty ?? selected?.qty ?? orderBundles.find((b) => b.id === bundleId)?.qty ?? 0;
  const goodAfterInspection = useMemo(() => {
    const m2 = Math.max(0, Number(m2Qty) || 0);
    const m4 = Math.max(0, Number(m4Qty) || 0);
    return Math.max(0, arrivalQty - m2 - m4);
  }, [arrivalQty, m2Qty, m4Qty]);
  const defectsTotal = (Number(m2Qty) || 0) + (Number(m4Qty) || 0);
  const inspectOk = arrivalQty > 0 && defectsTotal <= arrivalQty;
  const addedNum = Math.max(0, Number(goodAdded) || 0);
  const baseGoodAfterInspect = inspectionGood > 0 ? inspectionGood : goodAfterInspection;
  const suggestedPass = baseGoodAfterInspect + addedNum;
  const displayPassQty =
    passQtyTouched && passQty !== ''
      ? passQty
      : suggestedPass >= 1
        ? String(suggestedPass)
        : '';
  const passNum = Number(displayPassQty);
  const passOk = inspectOk && Number.isFinite(passNum) && passNum >= 1 && passNum <= suggestedPass;

  const pickable = useMemo(
    () => [...(board.results || []), ...(board.awaitingPass || []), ...(board.pendingPlacement || [])],
    [board.awaitingPass, board.pendingPlacement, board.results]
  );

  const resetFlow = () => {
    setStep('pick');
    setSelected(null);
    setBundleId('');
    setOrderId('');
    setOrderBundles([]);
    setM2Qty('');
    setM4Qty('0');
    setGoodAdded('0');
    setPassQty('');
    setPassQtyTouched(false);
    setInspectionGood(0);
    setError('');
    setLastSave(null);
  };

  const applyBundle = (row: UpcomingBundle, startStep?: Step) => {
    setSelected(row);
    setOrderId(row.orderId);
    setBundleId(row.id);
    setM2Qty(String(row.m2Qty ?? 0));
    setM4Qty(String(row.m4Qty ?? 0));
    setGoodAdded('0');
    const inspectedGood =
      row.inspectionGoodQty ?? Math.max(0, (row.arrivalQty ?? row.qty) - (row.m2Qty ?? 0) - (row.m4Qty ?? 0));
    setInspectionGood(inspectedGood);
    setPassQtyTouched(false);
    setPassQty(String(inspectedGood));
    const nextStep: Step =
      startStep || (row.floorInspected ? 'pass' : 'inspect');
    setStep(nextStep);
    setError('');
    factoryRequest<{ bundles: BundleRow[] }>(`/production/orders/${row.orderId}`)
      .then((detail) => setOrderBundles(detail.bundles || []))
      .catch(() => setOrderBundles([]));
  };

  const pickFromScan = () => {
    const needle = scan.trim().toLowerCase();
    if (!needle) return;
    const hit = pickable.find((row) => row.barcode.toLowerCase() === needle);
    if (hit) {
      applyBundle(hit, hit.floorInspected ? 'pass' : 'inspect');
      setScan('');
      return;
    }
    setError('No waiting bundle with that barcode. Close it on single piece cutting and place it on a rack first.');
  };

  const pickFromManual = async () => {
    if (!orderId || !bundleId) {
      setError('Choose order and bundle.');
      return;
    }
    const bundle = orderBundles.find((row) => row.id === bundleId) as BundleRow & { rackCode?: string; closed?: boolean };
    const order = orderRows.find((row) => row.id === orderId);
    const qty = Number(bundle?.qty ?? 0);
    if (!bundle || qty < 1) {
      setError('Bundle not found or empty.');
      return;
    }
    if (bundle.closed === false) {
      setError('This bundle is still open. Close it on Single piece cutting first.');
      return;
    }
    if (!bundle.barcode) {
      setError('This bundle has no barcode. Close it on Single piece cutting first.');
      return;
    }
    if (!bundle.rackCode) {
      setError('Place this bundle on a bundles rack in Single piece cutting before floor check.');
      return;
    }
    setSelected({
      id: bundleId,
      barcode: bundle.barcode || '',
      orderId,
      orderNumber: order?.orderNumber || '',
      qty,
      rackCode: bundle.rackCode || '',
    });
    setM2Qty('0');
    setM4Qty('0');
    setStep('inspect');
    setError('');
  };

  const saveInspection = async (finishLater: boolean) => {
    if (!bundleId || !inspectOk) {
      setError(`M2 + M4 cannot exceed arrival quantity (${arrivalQty}).`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const saved = await factoryRequest<{ inspectionGoodQty: number; arrivalQty: number }>('/quality/bundle-checks/inspect', {
        method: 'POST',
        body: JSON.stringify({
          eventId: `bdl-insp-${bundleId}-${Date.now()}`,
          bundleId,
          m2Qty: Number(m2Qty || 0),
          m4Qty: Number(m4Qty || 0),
        }),
      });
      setInspectionGood(saved.inspectionGoodQty);
      await loadUpcoming({ silent: true });
      if (finishLater) {
        resetFlow();
        return;
      }
      setStep('pass');
      setPassQtyTouched(false);
      setPassQty(String(saved.inspectionGoodQty + (Number(goodAdded) || 0)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save inspection');
    } finally {
      setLoading(false);
    }
  };

  const savePass = async () => {
    if (!bundleId || !passOk) {
      setError(`Pass quantity must be between 1 and ${suggestedPass} (good after inspection + added).`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const saved = await factoryRequest<BundleCheckSaveResult>('/quality/bundle-checks/pass', {
        method: 'POST',
        body: JSON.stringify({
          eventId: `bdl-pass-${bundleId}-${Date.now()}`,
          bundleId,
          goodAddedQty: addedNum,
          passGoodQty: passNum,
        }),
      });
      setLastSave(saved);
      await loadUpcoming({ silent: true });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pass bundle');
    } finally {
      setLoading(false);
    }
  };

  const rejectRoll = async () => {
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/quality/roll-rejections', {
        method: 'POST',
        body: JSON.stringify({ eventId: `rej-${rollBarcode}-${Date.now()}`, rollBarcode, rackCode }),
      });
      setRollBarcode('');
      setRackCode('');
      setShowReject(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject roll');
    } finally {
      setLoading(false);
    }
  };

  const upcomingCount =
    board.counts?.waiting ??
    (board.results?.length ?? 0) + (board.pendingPlacement?.length ?? 0);
  const receivedCount =
    board.counts?.received ?? (board.awaitingPass?.length ?? 0) + (board.received?.length ?? 0);
  const closedBundles = orderBundles.filter((b) => b.closed !== false || (b.qty ?? 0) > 0);

  return (
    <RequireCrudPermission path="Quality / Floor checks" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Floor checks" />
        <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-5 w-[3px] rounded bg-purple-600" aria-hidden />
              <h1 className="text-sm font-bold text-gray-800">Floor checks</h1>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-purple-300 hover:text-purple-700"
                aria-label="How this screen fits in the flow"
                aria-expanded={showFlowHelp}
                onClick={() => setShowFlowHelp((open) => !open)}
              >
                <i className="ri-information-line text-base" aria-hidden />
              </button>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">{upcomingCount} waiting</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <UiButton
                type="button"
                variant="secondary"
                icon="ri-refresh-line"
                loading={boardLoading}
                onClick={() => loadUpcoming({ silent: board.results.length > 0 }).catch(() => undefined)}
              >
                Refresh
              </UiButton>
              <UiButton type="button" variant="secondary" icon="ri-file-list-3-line" onClick={() => setShowDefectLog(true)}>
                Defect log
              </UiButton>
            </div>
          </header>

          <FloorDefectLogDrawer
            open={showDefectLog}
            onClose={() => setShowDefectLog(false)}
            orderId={orderId || selected?.orderId}
            orderNumber={selected?.orderNumber || orderRows.find((o) => o.id === orderId)?.orderNumber}
          />

          {showFlowHelp ? (
            <section className="border-b border-gray-100 bg-purple-50/80 px-4 py-3" aria-label="Floor check workflow">
              <p className="text-[11px] font-bold uppercase tracking-wide text-purple-900">Workflow</p>
              <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-700">
                <li>
                  <span className="font-semibold text-gray-900">1.</span>{' '}
                  <Link href="/production/floor/bundle" className="text-purple-700 underline">
                    Single piece cutting
                  </Link>{' '}
                  — cut pieces, <strong>close</strong> bundle (gets <code className="text-[11px]">BD-…</code> barcode)
                </li>
                <li>
                  <span className="font-semibold text-gray-900">2.</span> Same screen — <strong>place</strong> closed bundle on a <strong>bundles</strong> rack
                </li>
                <li>
                  <span className="font-semibold text-gray-900">3.</span> Here — <strong>inspect</strong> (M2/M4), optionally top up offline, then <strong>pass</strong> good qty
                </li>
                <li>
                  <span className="font-semibold text-gray-900">4.</span>{' '}
                  <Link href="/production/floor/horizontal-hem" className="text-purple-700 underline">
                    Horizontal hemming
                  </Link>{' '}
                  — bundle shows under Upcoming
                </li>
              </ol>
              <p className="mt-2 text-[11px] text-gray-600">
                <strong>Upcoming</strong> = inspect M2/M4 · <strong>Received</strong> = inspected, finish top-up and pass (or fix blockers). Swaps between bundles
                stay on the floor — only totals are stored.
              </p>
            </section>
          ) : null}

          <div
            className={
              queueTab === 'completed'
                ? 'grid gap-4 p-4'
                : 'grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]'
            }
          >
            <section aria-label="Bundle queue">
              <QueueTabs
                upcomingCount={upcomingCount}
                receivedCount={receivedCount}
                completedCount={board.completed?.length || board.counts?.completed || 0}
                onTabChange={setQueueTab}
                upcoming={(
                  <div className="grid gap-3">
                    {(board.pendingPlacement?.length || 0) > 0 ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">Needs rack placement</p>
                        <p className="mb-2 text-[11px] text-amber-950">
                          Closed bundles waiting to be placed on a <strong>bundles</strong> rack in{' '}
                          <Link href="/production/floor/bundle" className="font-semibold text-purple-700 underline">
                            Single piece cutting
                          </Link>
                          .
                        </p>
                        <BundleTable rows={board.pendingPlacement || []} emptyText="" />
                      </div>
                    ) : null}
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-600">Inspect now (on rack)</p>
                      <BundleTable
                        rows={board.results}
                        emptyText="Nothing here yet. Close the bundle, place it on a bundles rack, then refresh."
                        onPick={(row) => applyBundle(row, 'inspect')}
                      />
                    </div>
                  </div>
                )}
                received={(
                  <div className="grid gap-3">
                    <p className="text-[11px] text-gray-600">
                      Inspected bundles waiting for <strong>top-up and pass</strong>, plus any passed bundles that need a fix before hemming.
                    </p>
                    {(board.awaitingPass?.length || 0) > 0 ? (
                      <div className="rounded-md border border-purple-200 bg-purple-50/60 p-3">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-purple-900">Awaiting pass (top-up)</p>
                        <p className="mb-2 text-[11px] text-purple-950">
                          Defects saved. Add good pieces offline, then enter <strong>good added</strong> and <strong>pass qty</strong>.
                        </p>
                        <BundleTable
                          rows={board.awaitingPass || []}
                          emptyText=""
                          onPick={(row) => applyBundle(row, 'pass')}
                        />
                      </div>
                    ) : null}
                    {(board.received?.length || 0) > 0 ? (
                      <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-600">Blocked after pass</p>
                        <BundleTable
                          rows={board.received || []}
                          emptyText=""
                          showHandoffStatus
                        />
                      </div>
                    ) : null}
                    {!board.awaitingPass?.length && !board.received?.length ? (
                      <p className="text-center text-[11px] text-gray-400 py-8">Nothing in received. After inspect, bundles appear here for pass.</p>
                    ) : null}
                  </div>
                )}
                completed={
                  <CompletedQueueTable
                    rows={board.completed || []}
                    codeLabel="Bundle"
                    qtyIsTransferable
                    qtyColumnLabel="To next floor"
                    showGood
                    showArrival
                    showM2
                    showM4
                    showAdded
                    showNextStep
                    emptyText="No floor checks saved in the last two weeks."
                  />
                }
              />
            </section>

            {queueTab === 'completed' ? null : (
            <section aria-label="Bundle check steps" className="rounded-md border border-gray-200 bg-[#F9FAFB] p-4">
              <ol className="mb-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                <li className={step === 'pick' ? 'text-purple-700' : 'text-gray-400'}>1. Pick</li>
                <li className={step === 'inspect' ? 'text-purple-700' : 'text-gray-400'}>2. Inspect</li>
                <li className={step === 'pass' ? 'text-purple-700' : 'text-gray-400'}>3. Pass</li>
                <li className={step === 'done' ? 'text-purple-700' : 'text-gray-400'}>4. Done</li>
              </ol>

              {step === 'pick' ? (
                <div className="grid gap-3">
                  <p className="text-[12px] text-gray-600">
                    Scan or <strong>click</strong> a bundle under <strong>Upcoming → Inspect now</strong> or <strong>Received → Awaiting pass</strong>.
                  </p>
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      pickFromScan();
                    }}
                  >
                    <label className="min-w-[10rem] flex-1">
                      <span className={labelClass}>Bundle barcode</span>
                      <input className={fieldClass} value={scan} onChange={(e) => setScan(e.target.value)} placeholder="Scan BD-…" autoComplete="off" />
                    </label>
                    <UiButton type="submit" variant="primary">
                      Next
                    </UiButton>
                  </form>
                  <details
                    className="border-t border-gray-200 pt-3"
                    onToggle={(e) => {
                      if (e.currentTarget.open) ensureOrderPicklist().catch(() => undefined);
                    }}
                  >
                    <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Pick by order (only if already on rack)
                    </summary>
                    <div className="mt-3">
                    <label className="block">
                      <span className={labelClass}>Order</span>
                      <select
                        className={fieldClass}
                        value={orderId}
                        disabled={ordersLoading}
                        onChange={async (e) => {
                          const next = e.target.value;
                          setOrderId(next);
                          setBundleId('');
                          if (!next) {
                            setOrderBundles([]);
                            return;
                          }
                          const detail = await factoryRequest<{ bundles: BundleRow[] }>(`/production/orders/${next}`);
                          setOrderBundles(detail.bundles || []);
                        }}
                      >
                        <option value="">{ordersLoading ? 'Loading orders…' : 'Select order'}</option>
                        {orderRows.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.orderNumber || order.id.slice(-6)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-3 block">
                      <span className={labelClass}>Closed bundle</span>
                      <select className={fieldClass} value={bundleId} onChange={(e) => setBundleId(e.target.value)} disabled={!orderId}>
                        <option value="">Select bundle</option>
                        {closedBundles.map((bundle) => (
                          <option key={bundle.id} value={bundle.id}>
                            {bundle.barcode || `#${bundle.number}`} · qty {bundle.qty}
                            {bundle.closed === false ? ' (open)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-4 flex justify-end">
                      <UiButton type="button" variant="primary" disabled={!orderId || !bundleId} onClick={() => pickFromManual().catch(() => undefined)}>
                        Next → inspect
                      </UiButton>
                    </div>
                    </div>
                  </details>
                </div>
              ) : null}

              {step === 'inspect' && selected ? (
                <div className="grid gap-3">
                  <div className="rounded border border-white bg-white p-3 text-[12px] shadow-sm">
                    <p className="font-bold text-gray-900">{selected.barcode || 'Bundle'}</p>
                    <p className="text-gray-600">
                      {selected.orderNumber}
                      {selected.articleLabel ? ` · ${selected.articleLabel}` : ''} · arrival <strong>{arrivalQty}</strong>
                      {selected.rackCode ? ` · rack ${selected.rackCode}` : ' · ⚠ no rack'}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Record <strong>M2</strong> and <strong>M4</strong> found in the bundle. This is saved to the defect log with a timestamp.
                  </p>
                  <label>
                    <span className={labelClass}>M2 qty</span>
                    <input className={fieldClass} type="number" min={0} value={m2Qty} onChange={(e) => setM2Qty(e.target.value)} />
                  </label>
                  <label>
                    <span className={labelClass}>M4 qty</span>
                    <input className={fieldClass} type="number" min={0} value={m4Qty} onChange={(e) => setM4Qty(e.target.value)} />
                  </label>
                  <label>
                    <span className={labelClass}>Good after inspection</span>
                    <input
                      className={`${fieldClass} cursor-not-allowed bg-gray-100 text-gray-700`}
                      type="number"
                      readOnly
                      tabIndex={-1}
                      value={goodAfterInspection}
                    />
                  </label>
                  <p className={`text-[11px] font-medium ${inspectOk ? 'text-green-700' : 'text-red-600'}`}>
                    Defects: {defectsTotal} / {arrivalQty} {inspectOk ? '✓' : ''}
                  </p>
                  <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-3">
                    <UiButton type="button" variant="secondary" onClick={() => setStep('pick')}>
                      Back
                    </UiButton>
                    <div className="flex flex-wrap justify-end gap-2">
                      <UiButton
                        type="button"
                        variant="secondary"
                        loading={loading}
                        disabled={!inspectOk}
                        onClick={() => saveInspection(true).catch(() => undefined)}
                      >
                        Save &amp; finish later
                      </UiButton>
                      <UiButton
                        type="button"
                        variant="primary"
                        loading={loading}
                        disabled={!inspectOk}
                        onClick={() => saveInspection(false).catch(() => undefined)}
                      >
                        Continue → pass
                      </UiButton>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 'pass' && selected ? (
                <div className="grid gap-3">
                  <div className="rounded border border-white bg-white p-3 text-[12px] shadow-sm">
                    <p className="font-bold text-gray-900">{selected.barcode || 'Bundle'}</p>
                    <p className="text-gray-600">
                      After inspection: <strong>{inspectionGood > 0 ? inspectionGood : goodAfterInspection}</strong> good
                      {' · '}M2 <strong>{m2Qty || 0}</strong> · M4 <strong>{m4Qty || 0}</strong>
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Pieces moved between bundles stay offline. <strong>Remaining good</strong> is from inspection; add how many good
                    pieces QC put in; <strong>pass qty</strong> defaults to remaining + added (change only for a partial pass).
                  </p>
                  <label>
                    <span className={labelClass}>Good remaining in bundle (after inspect)</span>
                    <input
                      className={`${fieldClass} cursor-not-allowed bg-gray-100 text-gray-700`}
                      type="number"
                      min={0}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      value={baseGoodAfterInspect}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Good added by QC</span>
                    <input
                      className={fieldClass}
                      type="number"
                      min={0}
                      value={goodAdded}
                      onChange={(e) => {
                        const nextAdded = e.target.value;
                        setGoodAdded(nextAdded);
                        const added = Math.max(0, Number(nextAdded) || 0);
                        setPassQty(String(baseGoodAfterInspect + added));
                        setPassQtyTouched(false);
                      }}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Pass qty (to next floor)</span>
                    <input
                      className={fieldClass}
                      type="number"
                      min={1}
                      value={displayPassQty}
                      onChange={(e) => {
                        const next = e.target.value;
                        setPassQty(next);
                        setPassQtyTouched(next !== '');
                      }}
                    />
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Default pass = <strong>{baseGoodAfterInspect}</strong> remaining + <strong>{addedNum}</strong> added ={' '}
                    <strong>{suggestedPass}</strong>
                    {arrivalQty === 60 ? ' · Often 60 after top-up.' : ''}
                    {passQtyTouched && passQty !== '' && Number(passQty) !== suggestedPass ? ' · You edited pass qty.' : null}
                  </p>
                  <p className={`text-[11px] font-medium ${passOk ? 'text-green-700' : 'text-red-600'}`}>
                    Passing <strong>{displayPassQty || '—'}</strong> pcs {passOk ? '✓' : ''}
                  </p>
                  <div className="flex justify-between gap-2 border-t border-gray-200 pt-3">
                    <UiButton type="button" variant="secondary" onClick={() => setStep(selected.floorInspected ? 'pick' : 'inspect')}>
                      Back
                    </UiButton>
                    <UiButton type="button" variant="primary" loading={loading} disabled={!passOk} onClick={() => savePass().catch(() => undefined)}>
                      Pass to next floor
                    </UiButton>
                  </div>
                </div>
              ) : null}

              {step === 'done' ? (
                <div className="grid gap-3">
                  <p className="text-[12px] font-semibold text-green-800">Bundle passed to next floor.</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded border border-gray-200 bg-white p-3 text-[11px] text-gray-800">
                    <dt className="text-gray-500">Arrival</dt>
                    <dd>{lastSave?.arrivalQty ?? arrivalQty}</dd>
                    <dt className="text-gray-500">M2 / M4</dt>
                    <dd>
                      {lastSave?.m2Qty ?? m2Qty} / {lastSave?.m4Qty ?? m4Qty}
                    </dd>
                    <dt className="text-gray-500">Good added</dt>
                    <dd>{lastSave?.goodAddedQty ?? addedNum}</dd>
                    <dt className="font-bold text-gray-700">Passing</dt>
                    <dd className="font-bold text-purple-800">{lastSave?.passGoodQty ?? passNum}</dd>
                  </dl>
                  {lastSave?.readyForHorizontalHem !== false ? (
                    <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-900">
                      <p className="font-semibold">
                        {lastSave?.bundleBarcode || selected?.barcode} is ready for horizontal hemming
                        {lastSave?.rackCode ? ` (rack ${lastSave.rackCode})` : ''}.
                      </p>
                      <Link
                        href="/production/floor/horizontal-hem"
                        className="mt-2 inline-block rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700"
                      >
                        Open Horizontal hemming →
                      </Link>
                    </div>
                  ) : (
                    <p className="rounded border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-950">
                      Check saved but this bundle is not on the hem queue yet. Finish close + place on a bundles rack in single piece cutting,
                      then save the check again from the queue.
                    </p>
                  )}
                  <p className="text-[12px] text-gray-700">
                    It is listed under <strong>Completed</strong> on the left until horizontal hemming picks it up.
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Final order checking is later on{' '}
                    <Link href="/quality/final-checking" className="text-purple-700 underline">
                      Final checking
                    </Link>
                    , not on this screen.
                  </p>
                  <div className="flex justify-end pt-2">
                    <UiButton type="button" variant="primary" onClick={resetFlow}>
                      Check another bundle
                    </UiButton>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="mt-3 text-[12px] text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </section>
            )}
          </div>

          <details className="border-t border-gray-100 px-4 py-3" open={showReject} onToggle={(e) => setShowReject(e.currentTarget.open)}>
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-gray-500">Reject roll (optional)</summary>
            <div className="mt-3 grid max-w-md gap-3">
              <label>
                <span className={labelClass}>Roll</span>
                <select className={fieldClass} value={rollBarcode} onChange={(e) => setRollBarcode(e.target.value)}>
                  <option value="">Select roll</option>
                  {rolls.map((roll) => (
                    <option key={roll.id} value={roll.barcode}>
                      {roll.barcode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>Return rack</span>
                <select className={fieldClass} value={rackCode} onChange={(e) => setRackCode(e.target.value)}>
                  <option value="">Select rack</option>
                  {racks.map((rack) => (
                    <option key={rack.id} value={rack.code}>
                      {rack.code} · {rack.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end">
                <UiButton type="button" variant="secondary" className="!text-red-700" loading={loading} disabled={!rollBarcode || !rackCode} onClick={() => rejectRoll().catch(() => undefined)}>
                  Reject roll
                </UiButton>
              </div>
            </div>
          </details>
        </div>
      </div>
    </RequireCrudPermission>
  );
}