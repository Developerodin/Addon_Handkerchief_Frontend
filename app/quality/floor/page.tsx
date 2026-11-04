'use client';

import React, { useCallback, useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { EmptyQueue, QueueTabs } from '@/app/production/floor/shared/QueueTabs';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { BundleRow, factoryRequest, ProductionOrderRow, RollRow } from '@/shared/services/factoryApi';
import { listStorageRacks, StorageRack } from '@/shared/services/phase3CatalogService';

interface UpcomingBundle {
  id: string;
  barcode: string;
  orderId: string;
  orderNumber: string;
  qty: number;
  rackCode: string;
}

export default function FloorChecksPage() {
  const orders = useFactoryList<ProductionOrderRow>('/production/orders');
  const [bundleId, setBundleId] = useState('');
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [goodQty, setGoodQty] = useState('');
  const [defectQty, setDefectQty] = useState('');
  const [m4Qty, setM4Qty] = useState('');
  const [orderId, setOrderId] = useState('');
  const [finalGood, setFinalGood] = useState('');
  const [rollBarcode, setRollBarcode] = useState('');
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [rackCode, setRackCode] = useState('');
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [upcoming, setUpcoming] = useState<UpcomingBundle[]>([]);

  /**
   * Bundles single piece cutting put on a rack that this floor has not checked.
   */
  const loadUpcoming = useCallback(async () => {
    const data = await factoryRequest<{ results: UpcomingBundle[] }>('/quality/floor/upcoming');
    setUpcoming(data.results || []);
  }, []);

  useEffect(() => {
    loadUpcoming().catch((err) => setError(err instanceof Error ? err.message : 'Could not load upcoming bundles'));
  }, [loadUpcoming]);

  /**
   * Selects an upcoming bundle and loads that order's bundles into the check form.
   */
  const takeBundle = async (row: UpcomingBundle) => {
    setOrderId(row.orderId);
    setBundleId(row.id);
    setError('');
    try {
      const detail = await factoryRequest<{ bundles: BundleRow[] }>(`/production/orders/${row.orderId}`);
      const list = detail.bundles || [];
      if (!list.some((bundle) => bundle.id === row.id)) {
        list.unshift({ id: row.id, number: 0, qty: row.qty, closed: true, barcode: row.barcode });
      }
      setBundles(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bundles');
    }
  };

  useEffect(() => {
    listStorageRacks({ limit: 200, page: 1 })
      .then((data) => setRacks(data.results || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load racks'));
    factoryRequest<{ results: RollRow[] }>('/store/rolls?limit=100')
      .then((data) => setRolls(data.results || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load rolls'));
  }, []);

  /**
   * Posts one floor-check action and surfaces the API error.
   */
  const post = async (path: string, body: object) => {
    setError('');
    try {
      await factoryRequest(path, { method: 'POST', body: JSON.stringify(body) });
      setMessage('Saved');
      if (path === '/quality/bundle-checks') await loadUpcoming();
      return true;
    } catch (err) {
      setMessage('');
      setError(err instanceof Error ? err.message : 'Save failed');
      return false;
    }
  };

  return (
    <RequireCrudPermission path="Quality / Floor checks" action="read">
      <CatalogMasterFormPage seoTitle="Floor checks" title="Floor checks" listHref="/dashboards/main" listLabel="Dashboard" currentLabel="Floor checks">
        <div className="grid gap-6 p-4">
          <QueueTabs
            upcomingCount={upcoming.length}
            receivedCount={0}
            upcoming={(
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    {['Bundle', 'Order', 'Qty', 'Rack'].map((label) => (
                      <th key={label} className="border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#495057]">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcoming.length ? upcoming.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-gray-200 px-1.5 py-2.5 text-[12px]">
                        <button type="button" className="font-mono font-medium text-purple-600 hover:text-purple-700" onClick={() => { takeBundle(row).catch(() => undefined); }}>{row.barcode}</button>
                      </td>
                      <td className="border border-gray-200 px-1.5 py-2.5 text-[12px]">{row.orderNumber || row.orderId.slice(-6)}</td>
                      <td className="border border-gray-200 px-1.5 py-2.5 text-[12px]">{row.qty}</td>
                      <td className="border border-gray-200 px-1.5 py-2.5 text-[12px]">{row.rackCode || '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">No bundle is on a rack for floor checks.</td></tr>
                  )}
                </tbody>
              </table>
            )}
            received={<EmptyQueue text="A bundle leaves Upcoming after the check is saved." />}
          />
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              post('/quality/bundle-checks', {
                eventId: `bdl-${bundleId}-${Date.now()}`,
                bundleId,
                goodQty: Number(goodQty),
                defectQty: Number(defectQty || 0),
                m4Qty: Number(m4Qty || 0),
              });
            }}
          >
            <h2 className="text-sm font-semibold">Bundle check</h2>
            <select
              aria-label="Production order"
              className="form-control"
              value={orderId}
              onChange={async (event) => {
                const next = event.target.value;
                setOrderId(next);
                setBundleId('');
                if (!next) {
                  setBundles([]);
                  return;
                }
                try {
                  const detail = await factoryRequest<{ bundles: BundleRow[] }>(`/production/orders/${next}`);
                  setBundles(detail.bundles || []);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not load bundles');
                }
              }}
            >
              <option value="">Select order</option>
              {orders.rows.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber || order.productionType} · {order.revisionId}
                </option>
              ))}
            </select>
            <select aria-label="Bundle" className="form-control" value={bundleId} onChange={(event) => setBundleId(event.target.value)} required>
              <option value="">Select bundle</option>
              {bundles.map((bundle) => (
                <option key={bundle.id} value={bundle.id}>
                  #{bundle.number} · {bundle.qty}
                </option>
              ))}
            </select>
            <input aria-label="Good quantity" className="form-control" type="number" placeholder="Good" value={goodQty} onChange={(event) => setGoodQty(event.target.value)} required />
            <input aria-label="Defect quantity" className="form-control" type="number" placeholder="Defect" value={defectQty} onChange={(event) => setDefectQty(event.target.value)} />
            <input aria-label="M4 quantity" className="form-control" type="number" placeholder="M4" value={m4Qty} onChange={(event) => setM4Qty(event.target.value)} />
            <button type="submit" className="ti-btn ti-btn-primary w-fit">
              Save bundle check
            </button>
          </form>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              post('/quality/final-checks', { eventId: `fin-${orderId}-${Date.now()}`, orderId, goodQty: Number(finalGood) });
            }}
          >
            <h2 className="text-sm font-semibold">Final good quantity</h2>
            <select aria-label="Final check order" className="form-control" value={orderId} onChange={(event) => setOrderId(event.target.value)} required>
              <option value="">Select order</option>
              {orders.rows.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber || order.productionType} · {order.revisionId}
                </option>
              ))}
            </select>
            <input aria-label="Final good quantity" className="form-control" type="number" placeholder="Good quantity" value={finalGood} onChange={(event) => setFinalGood(event.target.value)} required />
            <button type="submit" className="ti-btn ti-btn-primary w-fit">
              Save final check
            </button>
          </form>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              post('/quality/roll-rejections', { eventId: `rej-${rollBarcode}-${Date.now()}`, rollBarcode, rackCode });
            }}
          >
            <h2 className="text-sm font-semibold">Reject roll back to a rack</h2>
            <select aria-label="Rejected roll" className="form-control" value={rollBarcode} onChange={(event) => setRollBarcode(event.target.value)} required>
              <option value="">Select roll</option>
              {rolls.map((roll) => (
                <option key={roll.id} value={roll.barcode}>
                  {roll.barcode}
                </option>
              ))}
            </select>
            <select aria-label="Return rack" className="form-control" value={rackCode} onChange={(event) => setRackCode(event.target.value)} required>
              <option value="">Select rack</option>
              {racks.map((rack) => (
                <option key={rack.id} value={rack.code}>
                  {rack.code} · {rack.name}
                </option>
              ))}
            </select>
            <button type="submit" className="ti-btn ti-btn-outline-danger w-fit">
              Reject roll
            </button>
          </form>
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
