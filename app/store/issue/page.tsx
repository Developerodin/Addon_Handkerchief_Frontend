'use client';

import React, { useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiButton } from '@/shared/components/ui';
import { FactoryDrawer } from '@/shared/components/factory/FactoryDrawer';
import { OrderLogPanel } from '@/shared/components/factory/OrderLogPanel';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { factoryRequest, ProductionOrderRow } from '@/shared/services/factoryApi';

export default function IssuePage() {
  const orders = useFactoryList<ProductionOrderRow>('/production/orders');
  const [orderId, setOrderId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  return (
    <RequireCrudPermission path="Fabric / Issue" action="read">
      <CatalogMasterFormPage seoTitle="Fabric issue" title="Fabric issue" listHref="/store/racks" listLabel="Fabric storage" currentLabel="Fabric issue">
        <form
          className="grid gap-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            setMessage('');
            try {
              await factoryRequest('/store/issues', {
                method: 'POST',
                body: JSON.stringify({ rollBarcode: barcode.trim(), orderId, eventId: `iss-${Date.now()}` }),
              });
              setMessage(`${barcode.trim()} issued`);
              setBarcode('');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Issue failed');
            }
          }}
        >
          <label className="form-label" htmlFor="issueOrder">
            Production order
          </label>
          <select id="issueOrder" aria-label="Production order" className="form-control" required value={orderId} onChange={(event) => setOrderId(event.target.value)}>
            <option value="">Select order</option>
            {orders.rows.map((order) => (
              <option key={order.id} value={order.id}>
                {order.productionType} · {order.revisionId} · {order.targetQty}
              </option>
            ))}
          </select>
          <label className="form-label" htmlFor="issueBarcode">
            Roll barcode
          </label>
          <input
            id="issueBarcode"
            aria-label="Roll barcode"
            className="form-control"
            placeholder="Scan or type roll barcode"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            required
            autoFocus
          />
          <div className="flex gap-2">
            <UiButton type="submit" variant="primary" icon="ri-barcode-line">
              Issue
            </UiButton>
            <UiButton type="button" variant="secondary" icon="ri-file-list-3-line" onClick={() => setLogsOpen(true)}>
              Logs
            </UiButton>
          </div>
        </form>
        {message ? <p className="px-4 text-sm text-green-700">{message}</p> : null}
        {error ? (
          <p className="px-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {orders.error ? (
          <p className="px-4 text-sm text-red-600" role="alert">
            {orders.error}
          </p>
        ) : null}
      </CatalogMasterFormPage>
      <FactoryDrawer title="Issue logs" subtitle="Rolls issued to a production order" open={logsOpen} wide onClose={() => setLogsOpen(false)}>
        {logsOpen ? <OrderLogPanel action="issued" /> : null}
      </FactoryDrawer>
    </RequireCrudPermission>
  );
}
