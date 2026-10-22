'use client';

import React, { useState } from 'react';
import { UiButton } from '@/shared/components/ui';
import { DrawerSection, DrawerStat } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest, itemScopeId, listScopeRevisions, OrderDetail, ScopeRevision } from '@/shared/services/factoryApi';
import { getProductById } from '@/shared/services/productService';
import { orderDateLabel } from './orderLabels';

/**
 * Header, lines, pinned snapshot, segments, and floors for one order.
 */
export function OrderView({ detail, onChanged }: { detail: OrderDetail; onChanged: () => void }) {
  const order = detail.order;
  const [lineId, setLineId] = useState(order.lines?.[0]?.id || '');
  const [revisionId, setRevisionId] = useState('');
  const [revisions, setRevisions] = useState<ScopeRevision[]>([]);
  const [remainingQty, setRemainingQty] = useState('');
  const [error, setError] = useState('');

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
      <DrawerSection title="Floors">
        <table>
          <thead>
            <tr>
              <th>Floor</th>
              <th>Received</th>
              <th>Completed</th>
              <th>Transferred</th>
            </tr>
          </thead>
          <tbody>
            {(order.floors || []).map((floor) => (
              <tr key={`${floor.sortOrder}-${floor.floor}`}>
                <td>{floor.name || floor.floor}</td>
                <td>{floor.receivedQty || 0}</td>
                <td>{floor.completedQty}</td>
                <td>{floor.transferredQty || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
