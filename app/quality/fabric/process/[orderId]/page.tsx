'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { factoryRequest, PurchaseOrderRow, RollRow } from '@/shared/services/factoryApi';
import { formatInr } from '@/app/store/purchase-orders/add/purchaseOrderFormModel';
import { orderTotal } from '@/app/store/po-received/goodsReceivedModel';
import { UiStatusBadge } from '@/shared/components/ui';
import { activeReceivedLots, LotQcAction, receivedQuantity, visibleQcRolls } from '../../fabricQcLots';
import { FabricQcHistorySection } from './FabricQcHistorySection';
import { FabricQcLotCard } from './FabricQcLotCard';
import { QcActionConfirm, QcPendingAction } from './QcActionConfirm';
import { ScannedRollsSection } from './ScannedRollsSection';

/**
 * Fabric QC for one purchase order: the received lots from PO process, scan, pass or hold, and history.
 */
export default function FabricQcProcessRoute() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading QC…</p>}>
      <FabricQcProcessPage />
    </Suspense>
  );
}

function FabricQcProcessPage() {
  const params = useParams<{ orderId: string }>();
  const search = useSearchParams();
  const orderId = params.orderId;
  const historyView = search.get('view') === 'history';
  const scanRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<QcPendingAction | null>(null);

  /**
   * Puts the caret back in the scan box once the confirm dialog is gone.
   */
  const focusScan = useCallback(() => {
    window.requestAnimationFrame(() => scanRef.current?.focus());
  }, []);

  /**
   * Focuses the scan box as soon as it is in the document.
   * Auth and the order fetch both mount this field after the page effect runs.
   */
  const bindScan = useCallback((node: HTMLInputElement | null) => {
    scanRef.current = node;
    if (!node || pending) return;
    focusScan();
  }, [focusScan, pending]);

  const [order, setOrder] = useState<PurchaseOrderRow | null>(null);
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [scanned, setScanned] = useState<RollRow[]>([]);
  const [scan, setScan] = useState('');
  const [deciding, setDeciding] = useState('');
  const [rollBusy, setRollBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const data = await factoryRequest<{ order: PurchaseOrderRow; rolls: RollRow[] }>(`/quality/fabric-orders/${orderId}`);
    setOrder(data.order);
    const nextRolls = data.rolls || [];
    setRolls(nextRolls);
    setScanned((current) => visibleQcRolls(nextRolls, current));
    document.title = `${historyView ? 'QC History' : 'QC'} ${data.order.number}`;
  }, [orderId, historyView]);

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load this order';
        setError(message);
        toast.error(message);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (historyView || !order || pending) return;
    const frame = window.requestAnimationFrame(() => scanRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [historyView, order, pending]);

  const lots = useMemo(() => (order ? activeReceivedLots(order) : []), [order]);
  const rollsByLot = useMemo(() => {
    const map = new Map<string, RollRow[]>();
    rolls.forEach((roll) => {
      const key = roll.receivedLotNumber || '';
      map.set(key, [...(map.get(key) || []), roll]);
    });
    return map;
  }, [rolls]);

  const unit = order?.lines?.[0]?.unitName || '';
  const received = order ? receivedQuantity(order) : 0;

  /**
   * Adds the scanned roll to the session list. A second scan of the same roll is ignored.
   */
  const onScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || pending) return;
    const code = scan.trim();
    if (!code) return;
    const found = rolls.find((roll) => roll.barcode === code || roll.rollCode === code);
    if (!found) {
      toast.error('Scanned barcode is not on this order');
      focusScan();
      return;
    }
    setScanned((current) => (current.some((roll) => roll.id === found.id) ? current : [...current, found]));
    setScan('');
    toast.success(found.rollCode || found.barcode);
    focusScan();
  };

  /**
   * Writes one roll's QC status and keeps it in the scanned list. The lot stays pending.
   */
  const saveRoll = async (roll: RollRow, action: 'pass' | 'reject'): Promise<boolean> => {
    setRollBusy(roll.barcode);
    setError('');
    try {
      const saved = await factoryRequest<RollRow>(`/quality/rolls/${action}`, {
        method: 'POST',
        body: JSON.stringify({ poId: orderId, barcode: roll.barcode }),
      });
      const next = { ...roll, ...saved, qcStatus: action === 'pass' ? 'passed' as const : 'rejected' as const };
      setRolls((current) => current.map((row) => (row.id === roll.id ? next : row)));
      setScanned((current) => current.map((row) => (row.id === roll.id ? next : row)));
      toast.success(`${roll.rollCode || roll.barcode} ${action === 'pass' ? 'passed' : 'rejected'}`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : `Could not ${action} this roll`;
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setRollBusy('');
    }
  };

  /**
   * Pass approves every roll on the lot that is not already rejected. Reject and hold cover the lot.
   */
  const decide = async (lotNumber: string, action: LotQcAction, remarks: string): Promise<boolean> => {
    setDeciding(lotNumber);
    setError('');
    try {
      await factoryRequest('/quality/received-lots', {
        method: 'POST',
        body: JSON.stringify({ poId: orderId, lotNumber, action, remarks }),
      });
      const label = action === 'pass' ? 'passed' : action === 'reject' ? 'rejected' : 'held';
      toast.success(`Lot ${lotNumber} ${label}`);
      setScanned((current) => current.filter((roll) => roll.receivedLotNumber !== lotNumber));
      await load();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save QC';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setDeciding('');
    }
  };

  /**
   * Runs the QC action that the operator just confirmed.
   */
  const confirmPending = async () => {
    if (!pending) return;
    const ok = pending.kind === 'pass-roll' || pending.kind === 'reject-roll'
      ? await saveRoll(pending.roll, pending.kind === 'pass-roll' ? 'pass' : 'reject')
      : await decide(
        pending.lotNumber,
        pending.kind === 'pass-lot' ? 'pass' : pending.kind === 'reject-lot' ? 'reject' : 'hold',
        pending.remarks,
      );
    if (ok) setPending(null);
  };

  /**
   * Opens the lot confirmation. The lot card does not save until this dialog is confirmed.
   */
  const askLot = (lotNumber: string, action: LotQcAction, remarks: string) => {
    const kind = action === 'pass' ? 'pass-lot' : action === 'reject' ? 'reject-lot' : 'hold-lot';
    setPending({ kind, lotNumber, remarks });
  };

  return (
    <RequireCrudPermission path="Quality / Fabric QC" action="read">
      <Toaster position="top-right" />
      <div className="main-content !px-4 !py-4 sm:!px-6 sm:!py-5">
        <div className="space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <header className="flex flex-wrap items-center gap-2">
            <Link href="/quality/fabric" aria-label="Back to fabric QC" className="rounded border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50">
              <i className="ri-arrow-left-line" aria-hidden />
            </Link>
            <span className="h-5 w-[3px] rounded bg-primary" aria-hidden />
            <h1 className="text-sm font-bold text-gray-800">{historyView ? 'QC History' : 'QC Process Order'}</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{order?.number || '…'}</span>
          </header>
          {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
          {order ? (
            <section className="grid grid-cols-2 gap-x-6 gap-y-4 rounded border border-gray-200 bg-gray-50 p-4 md:grid-cols-4">
              <Detail label="PO number" value={order.number} />
              <Detail label="Supplier" value={order.supplierName} />
              <Detail label="Status" value={<UiStatusBadge status={order.status} />} />
              <Detail label="Total amount" value={formatInr(orderTotal(order.lines))} />
              <Detail label="Total items" value={String(order.lines?.length || 0)} />
              <Detail label="Received quantity" value={`${received.toLocaleString('en-IN')} ${unit}`.trim()} />
              <Detail label="Lots" value={String(lots.length)} />
              <Detail label="Rolls" value={String(rolls.length)} />
            </section>
          ) : null}
          {order?.notes ? (
            <section className="rounded border border-gray-200 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Notes</p>
              <p className="text-sm text-gray-800">{order.notes}</p>
            </section>
          ) : null}
          {historyView && order ? <FabricQcHistorySection order={order} rolls={rolls} /> : null}
          {!historyView && order ? (
            <>
              <section>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500" htmlFor="qc-scan">Scan roll barcode</label>
                <input
                  id="qc-scan"
                  ref={bindScan}
                  autoFocus
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Scan or enter roll barcode"
                  value={scan}
                  aria-label="Scan roll barcode"
                  onChange={(event) => setScan(event.target.value)}
                  onKeyDown={onScan}
                />
              </section>
              <ScannedRollsSection
                rolls={scanned}
                lines={order.lines || []}
                busyBarcode={rollBusy}
                onPass={(roll) => setPending({ kind: 'pass-roll', roll })}
                onReject={(roll) => setPending({ kind: 'reject-roll', roll })}
                onRemove={(roll) => setScanned((current) => current.filter((row) => row.id !== roll.id))}
              />
              <section className="space-y-3" aria-label="Received lots">
                <h2 className="text-xs font-bold text-gray-800">Received lots ({lots.length})</h2>
                {lots.length ? lots.map((lot, index) => (
                  <div id={`lot-${lot.lotNumber}`} key={lot.lotNumber}>
                    <FabricQcLotCard
                      index={index}
                      orderId={orderId}
                      lot={lot}
                      lines={order.lines || []}
                      rolls={rollsByLot.get(lot.lotNumber) || []}
                      deciding={deciding === lot.lotNumber}
                      onDecide={askLot}
                    />
                  </div>
                )) : <p className="text-sm text-gray-500">No received lots yet. Record them on PO received.</p>}
              </section>
            </>
          ) : null}
        </div>
      </div>
      <QcActionConfirm
        action={pending}
        busy={Boolean(deciding || rollBusy)}
        onConfirm={confirmPending}
        onClose={() => {
          if (deciding || rollBusy) return;
          setPending(null);
        }}
      />
    </RequireCrudPermission>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}
