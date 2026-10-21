'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiButton, UiFormFooter } from '@/shared/components/ui';
import { floorStageBySlug } from '@/shared/constants/factoryStages';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { BundleRow, factoryRequest, ProductionOrderRow } from '@/shared/services/factoryApi';
import { listMachines, Machine } from '@/shared/services/phase3CatalogService';

interface PrintedBundle {
  barcode: string;
  qty: number;
  fromFloor: string;
  toFloor: string;
  orderId: string;
}

/**
 * Opens the browser print dialog for the bundle label.
 */
const printBundleLabel = () => {
  window.print();
};

export default function FloorStagePage() {
  const params = useParams<{ stage: string }>();
  const stage = floorStageBySlug(params.stage);
  const orders = useFactoryList<ProductionOrderRow>('/production/orders', { floor: stage?.stage || '' });
  const [orderId, setOrderId] = useState('');
  const [qty, setQty] = useState('');
  const [machineBarcode, setMachineBarcode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState<PrintedBundle | null>(null);

  const selected = orders.rows.find((order) => order.id === orderId);
  const step = selected?.floors?.find((floor) => floor.floor === stage?.stage);
  const received = step?.receivedQty ?? selected?.targetQty ?? 0;
  const done = step?.completedQty ?? 0;
  const sent = step?.transferredQty ?? 0;
  const remaining = received - sent;

  useEffect(() => {
    listMachines({ limit: 200, page: 1 })
      .then((data) => setMachines((data.results || []).filter((machine) => machine.barcode)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load machines'));
  }, []);

  if (!stage) {
    return <p className="p-6">Unknown floor stage.</p>;
  }

  return (
    <RequireCrudPermission path={`Production / ${stage.label}`} action="read">
      <style>{'@media print { body * { visibility: hidden; } #bundle-label, #bundle-label * { visibility: visible; } #bundle-label { position: absolute; left: 0; top: 0; } }'}</style>
      <CatalogMasterFormPage seoTitle={stage.label} title={stage.label} listHref="/production/orders" listLabel="Production orders" currentLabel={stage.label}>
        <form
          className="grid gap-3 border-b border-gray-200 p-4 print:hidden"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError('');
            try {
              await factoryRequest('/production/bundles/receive', {
                method: 'POST',
                body: JSON.stringify({ barcode: scanCode.trim(), stage: stage.stage }),
              });
              setMessage(`Received ${scanCode.trim()}`);
              setScanCode('');
              orders.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Scan failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="form-label" htmlFor="scanCode">
            Scan bundle barcode
          </label>
          <div className="flex gap-2">
            <input
              id="scanCode"
              aria-label="Bundle barcode"
              className="form-control"
              autoComplete="off"
              value={scanCode}
              onChange={(event) => setScanCode(event.target.value)}
              required
            />
            <UiButton type="submit" variant="primary" disabled={loading}>
              Receive
            </UiButton>
          </div>
        </form>
        <form
          className="grid gap-4 p-4 print:hidden"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError('');
            try {
              await factoryRequest('/production/completions', {
                method: 'POST',
                body: JSON.stringify({
                  eventId: `${stage.stage}-${orderId}-${Date.now()}`,
                  orderId,
                  stage: stage.stage,
                  qty: Number(qty),
                  machineBarcode,
                  remarks,
                  operatorId: localStorage.getItem('cachedUserId') || '',
                  site: 'factory',
                }),
              });
              setMessage('Completion recorded');
              setQty('');
              setRemarks('');
              orders.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Completion failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="form-label" htmlFor="orderId">
            Order
          </label>
          <select id="orderId" aria-label="Order" className="form-control" required value={orderId} onChange={(event) => setOrderId(event.target.value)}>
            <option value="">Select order</option>
            {orders.rows.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id.slice(-6)} · {order.productionType} · {order.targetQty}
              </option>
            ))}
          </select>
          {selected ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Floor quantities">
              {[
                ['Received', received],
                ['Done', done],
                ['Transferred', sent],
                ['Remaining', remaining],
              ].map(([name, value]) => (
                <div key={name} className="rounded-md border-2 border-gray-300 bg-white px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-gray-500">{name}</p>
                  <p className="text-sm font-bold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
          <label className="form-label" htmlFor="qty">
            Quantity
          </label>
          <input id="qty" aria-label="Quantity" className="form-control" type="number" required min={0} value={qty} onChange={(event) => setQty(event.target.value)} />
          <label className="form-label" htmlFor="machineBarcode">
            Machine
          </label>
          <select id="machineBarcode" aria-label="Machine" className="form-control" value={machineBarcode} onChange={(event) => setMachineBarcode(event.target.value)}>
            <option value="">Select machine</option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.barcode}>
                {machine.name} · {machine.barcode}
              </option>
            ))}
          </select>
          <label className="form-label" htmlFor="remarks">
            Remarks
          </label>
          <input id="remarks" aria-label="Remarks" className="form-control" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <UiFormFooter submitLabel="Complete" isLoading={loading} onCancel={() => setQty('')} />
            <UiButton
              type="button"
              variant="secondary"
              disabled={loading || !orderId}
              onClick={async () => {
                setLoading(true);
                setError('');
                try {
                  const bundle = await factoryRequest<BundleRow>(`/production/orders/${orderId}/transfer`, {
                    method: 'POST',
                    body: JSON.stringify({ qty: Number(qty), remarks }),
                  });
                  setLabel({
                    barcode: bundle.barcode || '',
                    qty: bundle.qty,
                    fromFloor: bundle.fromFloor || stage.stage,
                    toFloor: bundle.toFloor || '',
                    orderId,
                  });
                  setMessage(`Transferred ${bundle.barcode}`);
                  setQty('');
                  orders.reload();
                  window.setTimeout(printBundleLabel, 0);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Transfer failed');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Transfer
            </UiButton>
          </div>
        </form>
        {label ? (
          <section id="bundle-label" aria-label="Bundle label" className="m-4 rounded-md border-2 border-gray-300 bg-white p-4">
            <p className="text-[10px] font-bold uppercase text-gray-500">Bundle</p>
            <p className="font-mono text-2xl font-bold tracking-wide text-gray-900">{label.barcode}</p>
            <p className="mt-2 text-sm text-gray-700">
              Order {label.orderId.slice(-6)} · {label.qty} pcs
            </p>
            <p className="text-sm text-gray-700">
              {label.fromFloor} → {label.toFloor}
            </p>
            <UiButton type="button" variant="secondary" className="mt-3 print:hidden" onClick={printBundleLabel}>
              Print label
            </UiButton>
          </section>
        ) : null}
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
