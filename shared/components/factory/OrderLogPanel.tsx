'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryPage, OrderLogRow } from '@/shared/services/factoryApi';

const ACTIONS = ['issued', 'returned', 'vendor-return', 'rack', 'floor-complete', 'bundle-check', 'packing', 'box-rack', 'dispatch', 'po-status', 'grn'];

/**
 * Loads activity rows for one order, or every order when orderId is omitted.
 */
export function OrderLogPanel({ orderId, action = '' }: { orderId?: string; action?: string }) {
  const [rows, setRows] = useState<OrderLogRow[]>([]);
  const [pickedAction, setPickedAction] = useState(action);
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Reads the log list with the current filters.
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const path = orderId ? `/production/orders/${orderId}/logs` : '/production/logs';
      const data = await factoryPage<OrderLogRow>(path, 1, 100, '', {
        action: pickedAction,
        userId,
        entityType,
        from,
        to,
      });
      setRows(data.results || []);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Could not load logs');
    } finally {
      setLoading(false);
    }
  }, [orderId, pickedAction, userId, entityType, from, to]);

  useEffect(() => {
    setPickedAction(action);
  }, [action, orderId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="form-label" htmlFor="log-action">
          Action
          <select
            id="log-action"
            aria-label="Action"
            className="form-control mt-1"
            value={pickedAction}
            onChange={(event) => setPickedAction(event.target.value)}
          >
            <option value="">All actions</option>
            {ACTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label" htmlFor="log-user">
          User id
          <input
            id="log-user"
            aria-label="User id"
            className="form-control mt-1"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />
        </label>
        <label className="form-label" htmlFor="log-entity">
          Entity
          <select
            id="log-entity"
            aria-label="Entity"
            className="form-control mt-1"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            <option value="">All</option>
            <option value="roll">Roll</option>
            <option value="bundle">Bundle</option>
            <option value="box">Box</option>
            <option value="order">Order</option>
            <option value="po">Purchase order</option>
            <option value="grn">GRN</option>
          </select>
        </label>
        <label className="form-label" htmlFor="log-from">
          From
          <input id="log-from" aria-label="From" className="form-control mt-1" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="form-label" htmlFor="log-to">
          To
          <input id="log-to" aria-label="To" className="form-control mt-1" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>
      {loading ? <p className="text-sm text-gray-500">Loading logs…</p> : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <DrawerSection title="Activity">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Qty</th>
              <th>From / to</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.at ? new Date(row.at).toLocaleString('en-GB') : ''}</td>
                <td>{row.userName || row.userId || '—'}</td>
                <td>{row.action}</td>
                <td>
                  {row.entityType} {row.entityCode}
                </td>
                <td>{row.quantity}</td>
                <td>
                  {row.fromLocation || '—'} → {row.toLocation || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !rows.length ? <p className="px-3 py-3 text-[11px] text-gray-500">No activity yet</p> : null}
      </DrawerSection>
    </div>
  );
}
