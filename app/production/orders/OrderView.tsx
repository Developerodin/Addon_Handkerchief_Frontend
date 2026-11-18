'use client';

import React, { useState } from 'react';
import { UiButton } from '@/shared/components/ui';
import { BundleLabel, triggerBundleLabelPrint } from '@/shared/components/factory/BundleLabel';
import { DrawerSection, DrawerStat } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest, itemScopeId, listScopeRevisions, OrderDetail, ScopeRevision } from '@/shared/services/factoryApi';
import { getProductById } from '@/shared/services/productService';
import { dispatchStatusLabel, orderDateLabel, orderStatusLabel } from './orderLabels';
import { OrderPackingDispatch } from './OrderPackingDispatch';

/**
 * Header, lines, pinned snapshot, segments, and floors for one order.
 */
export function OrderView({ detail, onChanged }: { detail: OrderDetail; onChanged: () => void }) {
  const order = detail.order;
  const floorRows =
    detail.floorProgress?.length
      ? detail.floorProgress
      : (order.floors || []).map((step) => ({
          floor: step.floor,
          name: step.name || step.floor,
          workedQty: 0,
          receivedQty: step.receivedQty || 0,
          completedQty: step.completedQty || 0,
          transferredQty: step.transferredQty || 0,
        }));
  const [lineId, setLineId] = useState(order.lines?.[0]?.id || '');
  const [revisionId, setRevisionId] = useState('');
  const [revisions, setRevisions] = useState<ScopeRevision[]>([]);
  const [remainingQty, setRemainingQty] = useState('');
  const [error, setError] = useState('');
  const [issuedRoll, setIssuedRoll] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [printBarcode, setPrintBarcode] = useState('');

  /**
   * Published revisions for the line being amended.
   */
  const loadRevisions = async (nextLineId: string) => {
    setLineId(nextLineId);
    setRevisions([]);
    setRevisionId('');
    const line = (order.lines || []).find((row) => row.id === nextLineId);
    if (!line?.itemId) return;
    const product = await getProductById(line.itemId);
    if (!product) return;
    try {
      const data = await listScopeRevisions(
        itemScopeId({ ...product, id: line.itemId, productionType: line.productionType })
      );
      setRevisions((data.results || []).filter((revision) => revision.id !== (line.revisionId || order.revisionId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No published revision');
    }
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        <DrawerStat label="Order" value={order.orderNumber || '—'} />
        <DrawerStat label="Buyer" value={order.buyer || '—'} />
        <DrawerStat label="Required by" value={orderDateLabel(order.requiredBy)} />
        <DrawerStat label="Target" value={order.totalQty || order.targetQty} />
        <DrawerStat label="Floor" value={order.currentFloor || '—'} />
        <DrawerStat label="Packed good" value={detail.finalCheckingGood ?? 0} />
        <DrawerStat label="Production" value={orderStatusLabel(order.status)} />
        <DrawerStat
          label="Factory dispatch"
          value={
            order.dispatchedQty != null
              ? `${order.dispatchedQty}/${order.totalQty || order.targetQty} pcs · ${dispatchStatusLabel(order.dispatchStatus)}`
              : '—'
          }
        />
        <DrawerStat label="Shortfall" value={detail.packingShortfall ? `${detail.packingShortfall} pcs` : '—'} />
        <DrawerStat label="Priority" value={order.priority || 'Medium'} />
      </div>
      <DrawerSection title="Items">
        <table>
          <thead>
            <tr>
              <th>Article</th>
              <th>Qty</th>
              <th>Cut</th>
              <th>Revision</th>
            </tr>
          </thead>
          <tbody>
            {(order.lines || []).map((line) => (
              <tr key={line.id}>
                <td>
                  {line.factoryCode || '—'}
                  <span className="block text-[10px] text-gray-500">{line.articleName}</span>
                </td>
                <td>{line.quantity}</td>
                <td>{line.piecesPerCut || '—'}</td>
                <td>{line.revisionId || order.revisionId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DrawerSection>
      {(order.lines || []).some((line) => line.snapshot?.fabricBom?.length) ? (
        <DrawerSection title="Pinned fabric">
          <table>
            <thead>
              <tr>
                <th>Fabric</th>
                <th>m / piece</th>
                <th>Policy</th>
              </tr>
            </thead>
            <tbody>
              {(order.lines || []).flatMap((line) =>
                (line.snapshot?.fabricBom || []).map((fabric) => (
                  <tr key={`${line.id}-${fabric.bomLineId}`}>
                    <td>{fabric.fabricName}</td>
                    <td>{fabric.metresPerPiece}</td>
                    <td>{line.snapshot?.calculationPolicy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DrawerSection>
      ) : null}
      {order.status === 'released' || order.status === 'in-progress' ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <UiButton
            type="button"
            variant="secondary"
            disabled={issuing}
            onClick={async () => {
              setIssuing(true);
              setError('');
              try {
                const data = await factoryRequest<{ rollBarcode: string }>(`/production/orders/${order.id}/assume-issued`, {
                  method: 'POST',
                  body: JSON.stringify({}),
                });
                setIssuedRoll(data.rollBarcode);
                onChanged();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not treat fabric as issued');
              } finally {
                setIssuing(false);
              }
            }}
          >
            {issuing ? 'Issuing…' : 'Treat fabric as issued'}
          </UiButton>
          {issuedRoll ? <p className="font-mono text-xs text-gray-700">Roll {issuedRoll}</p> : null}
        </div>
      ) : null}
      {(detail.bundles || []).some((row) => row.barcode) ? (
        <>
          <style>{'@media print { body * { visibility: hidden; } #bundle-label, #bundle-label * { visibility: visible; } #bundle-label { position: absolute; left: 0; top: 0; } }'}</style>
          <DrawerSection title="Bundle labels">
            <ul className="grid gap-2 p-3">
              {detail.bundles
                .filter((row) => row.barcode)
                .map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-bold text-gray-900">{row.barcode}</span>
                    <span className="text-[11px] text-gray-600">qty {row.qty}</span>
                    <button
                      type="button"
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold text-[#495057] hover:bg-gray-50"
                      onClick={() => {
                        setPrintBarcode(row.barcode || '');
                        window.setTimeout(() => triggerBundleLabelPrint(), 0);
                      }}
                    >
                      Print
                    </button>
                  </li>
                ))}
            </ul>
            {printBarcode ? (
              <BundleLabel
                printing
                bundle={{
                  barcode: printBarcode,
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  qty: detail.bundles.find((row) => row.barcode === printBarcode)?.qty || 0,
                }}
              />
            ) : null}
          </DrawerSection>
        </>
      ) : null}
      <DrawerSection title="Floor progress">
        <p className="border-b border-gray-100 px-3 py-2 text-[10px] leading-snug text-gray-500">
          <span className="font-bold text-gray-700">Worked</span> comes from floor scan logs (how the factory actually runs).
          <span className="font-bold text-gray-700"> Received / completed / transferred</span> are legacy order counters — they update
          mainly on manual bundle transfer; they often stay 0 even when work is done.
        </p>
        <table>
          <thead>
            <tr>
              <th>Floor</th>
              <th>Worked (logs)</th>
              <th>Received</th>
              <th>Completed</th>
              <th>Transferred</th>
            </tr>
          </thead>
          <tbody>
            {floorRows.map((floor) => (
              <tr key={`${floor.floor}-${floor.name}`}>
                <td>{floor.name || floor.floor}</td>
                <td className={floor.workedQty ? 'font-semibold text-gray-900' : ''}>{floor.workedQty}</td>
                <td>{floor.receivedQty || 0}</td>
                <td>{floor.completedQty || 0}</td>
                <td>{floor.transferredQty || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {detail.finalCheckingGood != null ? (
          <p className="px-3 py-2 text-[11px] text-gray-600">
            Final checking good (quality): <span className="font-bold text-gray-900">{detail.finalCheckingGood}</span> pcs
            {detail.packingShortfall ? ` · shortfall ${detail.packingShortfall} before close` : ''}
          </p>
        ) : null}
      </DrawerSection>
      <DrawerSection title="Segments">
        <table>
          <thead>
            <tr>
              <th>Revision</th>
              <th>Qty</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {(order.segments || []).map((segment, index) => (
              <tr key={`${segment.revisionId}-${index}`}>
                <td>{segment.revisionId}</td>
                <td>{segment.qty}</td>
                <td>{segment.completedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DrawerSection>
      <OrderPackingDispatch detail={detail} />
      {order.status !== 'pending' && order.status !== 'closed' ? (
        <form
          className="mt-3 grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              await factoryRequest(`/production/orders/${order.id}/amend`, {
                method: 'POST',
                body: JSON.stringify({ revisionId, remainingQty: Number(remainingQty), lineId: lineId || undefined }),
              });
              onChanged();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Amend failed');
            }
          }}
        >
          <p className="text-sm font-medium">Move unfinished quantity onto a new revision</p>
          {(order.lines || []).length > 1 ? (
            <select aria-label="Line to amend" className="form-control" value={lineId} onChange={(event) => loadRevisions(event.target.value)}>
              {(order.lines || []).map((line) => (
                <option key={line.id} value={line.id}>
                  {line.factoryCode || line.articleName}
                </option>
              ))}
            </select>
          ) : null}
          <button type="button" className="text-left text-xs text-purple-700" onClick={() => loadRevisions(lineId || order.lines?.[0]?.id || '')}>
            Load revisions
          </button>
          <select aria-label="New revision" className="form-control" value={revisionId} onChange={(event) => setRevisionId(event.target.value)} required>
            <option value="">{revisions.length ? 'Select revision' : 'Load revisions first'}</option>
            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                {revision.sequence} · {revision.reason || revision.id}
              </option>
            ))}
          </select>
          <input
            aria-label="Remaining quantity"
            className="form-control"
            type="number"
            min={0}
            value={remainingQty}
            onChange={(event) => setRemainingQty(event.target.value)}
            required
          />
          <UiButton type="submit" variant="primary">
            Amend
          </UiButton>
        </form>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
