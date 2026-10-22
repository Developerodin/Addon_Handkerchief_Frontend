'use client';

import React, { useEffect, useState } from 'react';
import { UiStatusBadge } from '@/shared/components/ui';
import { ArticleLineRow, FabricEstimateRow, factoryRequest, UpcomingFloorRow } from '@/shared/services/factoryApi';
import { orderStatusLabel } from './orderLabels';

/**
 * Article lines across orders.
 */
export function ArticleViewTab({ onLogs }: { onLogs: (orderId: string) => void }) {
  const [rows, setRows] = useState<ArticleLineRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    factoryRequest<{ results: ArticleLineRow[] }>('/production/orders/articles?limit=100')
      .then((data) => setRows(data.results || []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load articles'));
  }, []);

  if (error) {
    return (
      <p className="p-4 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto p-2">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-2 py-2">Article</th>
            <th className="px-2 py-2">Order</th>
            <th className="px-2 py-2">Qty</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Progress</th>
            <th className="px-2 py-2">Priority</th>
            <th className="px-2 py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-gray-100">
              <td className="px-2 py-2">
                <span className="font-semibold">{row.factoryCode || '—'}</span>
                <span className="block text-[10px] text-gray-500">{row.articleName}</span>
              </td>
              <td className="px-2 py-2">
                {row.orderNumber}
                <span className="block text-[10px] text-gray-500">{row.orderNote}</span>
              </td>
              <td className="px-2 py-2">{row.quantity}</td>
              <td className="px-2 py-2">
                <UiStatusBadge status={orderStatusLabel(row.status)} />
              </td>
              <td className="px-2 py-2">{row.progress}%</td>
              <td className="px-2 py-2">{row.priority || 'Medium'}</td>
              <td className="px-2 py-2">
                <button type="button" className="text-purple-700" aria-label="Line logs" onClick={() => onLogs(row.orderId)}>
                  Logs
                </button>
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="px-2 py-4 text-gray-500" colSpan={7}>
                No articles
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Fabric metres versus basement stock. Does not raise a requisition.
 */
export function FabricEstimationTab() {
  const [rows, setRows] = useState<FabricEstimateRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    factoryRequest<{ results: FabricEstimateRow[] }>('/production/orders/fabric-estimation')
      .then((data) => setRows(data.results || []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load fabric estimation'));
  }, []);

  if (error) {
    return (
      <p className="p-4 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto p-2">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-2 py-2">Order</th>
            <th className="px-2 py-2">Article</th>
            <th className="px-2 py-2">Fabric</th>
            <th className="px-2 py-2">Required m</th>
            <th className="px-2 py-2">On hand m</th>
            <th className="px-2 py-2">Shortage m</th>
            <th className="px-2 py-2">Rolls</th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((row) =>
            (row.fabrics.length ? row.fabrics : [{ fabricName: '—', metresPerPiece: 0, requiredMetres: 0, onHandMetres: 0, shortageMetres: 0, onHandRolls: 0 }]).map(
              (fabric, index) => (
                <tr key={`${row.lineId}-${fabric.bomLineId || index}`} className="border-t border-gray-100">
                  <td className="px-2 py-2">{row.orderNumber}</td>
                  <td className="px-2 py-2">
                    {row.factoryCode || row.articleName} · {row.quantity}
                    <span className="block text-[10px] text-gray-500">{row.pinned ? 'Pinned' : 'Draft BOM'}</span>
                  </td>
                  <td className="px-2 py-2">{fabric.fabricName || '—'}</td>
                  <td className="px-2 py-2">{fabric.requiredMetres ?? 0}</td>
                  <td className="px-2 py-2">{fabric.onHandMetres ?? 0}</td>
                  <td className="px-2 py-2">{fabric.shortageMetres ?? 0}</td>
                  <td className="px-2 py-2">{fabric.onHandRolls ?? 0}</td>
                </tr>
              )
            )
          )}
          {!rows.length ? (
            <tr>
              <td className="px-2 py-4 text-gray-500" colSpan={7}>
                No open orders
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Quantity sitting on a floor, received and not transferred.
 */
export function UpcomingTab() {
  const [rows, setRows] = useState<UpcomingFloorRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    factoryRequest<{ results: UpcomingFloorRow[] }>('/production/orders/upcoming')
      .then((data) => setRows(data.results || []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load upcoming work'));
  }, []);

  if (error) {
    return (
      <p className="p-4 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto p-2">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-2 py-2">Floor</th>
            <th className="px-2 py-2">Quantity waiting</th>
            <th className="px-2 py-2">Orders</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.floor} className="border-t border-gray-100">
              <td className="px-2 py-2">{row.name || row.floor}</td>
              <td className="px-2 py-2">{row.quantity}</td>
              <td className="px-2 py-2">{row.orders}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="px-2 py-4 text-gray-500" colSpan={3}>
                Nothing is waiting on a floor yet
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
