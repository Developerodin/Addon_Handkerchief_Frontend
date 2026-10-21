'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { BoxRow, ClientOrderRow, factoryRequest, PackingBundleRow, ProductionOrderRow } from '@/shared/services/factoryApi';
import { listStorageRacks, StorageRack } from '@/shared/services/phase3CatalogService';

export default function BoxesPage() {
  const boxes = useFactoryList<BoxRow>('/warehouse/boxes');
  const bundles = useFactoryList<PackingBundleRow>('/warehouse/packing-bundles');
  const orders = useFactoryList<ProductionOrderRow>('/production/orders');
  const clientOrders = useFactoryList<ClientOrderRow>('/warehouse/orders');
  const [picked, setPicked] = useState<string[]>([]);
  const [scaleWeight, setScaleWeight] = useState('');
  const [clientOrderId, setClientOrderId] = useState('');
  const [productionOrderId, setProductionOrderId] = useState('');
  const [revisionId, setRevisionId] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [boxBarcode, setBoxBarcode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listStorageRacks({ limit: 200, page: 1 })
      .then((data) => setRacks(data.results || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load racks'));
  }, []);

  return (
    <RequireCrudPermission path="Warehouse / Boxes" action="read">
      <CatalogListShell
        seoTitle="Boxes"
        title="Boxes"
        count={boxes.total}
        searchQuery={boxes.search}
        onSearchChange={boxes.setSearch}
        itemsPerPage={boxes.limit}
        onItemsPerPageChange={boxes.setLimit}
        isLoading={boxes.loading}
        error={boxes.error}
        rows={boxes.rows}
        rowKey={(row) => row.id}
        currentPage={boxes.page}
        totalPages={boxes.totalPages}
        totalResults={boxes.total}
        onPageChange={boxes.setPage}
        columns={[
          { key: 'barcode', label: 'Barcode', render: (row) => row.barcode },
          { key: 'status', label: 'Status', render: (row) => row.status },
          { key: 'weight', label: 'Weight', render: (row) => row.scaleWeight },
          { key: 'rack', label: 'Rack', render: (row) => row.rackCode || '' },
        ]}
      >
        <form
          className="grid gap-3 p-4 border-b border-gray-100"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              await factoryRequest('/warehouse/boxes', {
                method: 'POST',
                body: JSON.stringify({
                  packingBundleBarcodes: picked,
                  scaleWeight: Number(scaleWeight),
                  clientOrderId,
                  productionOrderId,
                  revisionId,
                }),
              });
              setPicked([]);
              await boxes.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Box failed');
            }
          }}
        >
          <p className="text-sm font-medium">Packing bundles on the packing rack</p>
          {bundles.rows
            .filter((row) => row.onPackingRack)
            .map((row) => (
              <label key={row.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={row.barcode}
                  checked={picked.includes(row.barcode)}
                  onChange={(event) =>
                    setPicked((prev) => (event.target.checked ? [...prev, row.barcode] : prev.filter((code) => code !== row.barcode)))
                  }
                />
                {row.barcode} · {row.qty}
              </label>
            ))}
          <select aria-label="Client order" className="form-control" required value={clientOrderId} onChange={(event) => setClientOrderId(event.target.value)}>
            <option value="">Client order</option>
            {clientOrders.rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.clientName}
              </option>
            ))}
          </select>
          <select
            aria-label="Production order"
            className="form-control"
            required
            value={productionOrderId}
            onChange={(event) => {
              const next = orders.rows.find((row) => row.id === event.target.value);
              setProductionOrderId(event.target.value);
              setRevisionId(next?.revisionId || '');
            }}
          >
            <option value="">Production order</option>
            {orders.rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.productionType} · {row.revisionId}
              </option>
            ))}
          </select>
          <input aria-label="Revision" className="form-control" value={revisionId} readOnly />
          <input aria-label="Scale weight" className="form-control" type="number" placeholder="Scale weight" required value={scaleWeight} onChange={(event) => setScaleWeight(event.target.value)} />
          <button type="submit" className="ti-btn ti-btn-primary w-fit">
            Create box
          </button>
        </form>
        <form
          className="flex gap-2 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              await factoryRequest('/warehouse/boxes/rack', {
                method: 'POST',
                body: JSON.stringify({ boxBarcode, rackCode }),
              });
              await boxes.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Rack failed');
            }
          }}
        >
          <select aria-label="Box barcode" className="form-control" value={boxBarcode} onChange={(event) => setBoxBarcode(event.target.value)} required>
            <option value="">Select box</option>
            {boxes.rows
              .filter((box) => box.status !== 'dispatched')
              .map((box) => (
                <option key={box.id} value={box.barcode}>
                  {box.barcode}
                </option>
              ))}
          </select>
          <select aria-label="Box rack" className="form-control" value={rackCode} onChange={(event) => setRackCode(event.target.value)} required>
            <option value="">Select rack</option>
            {racks.map((rack) => (
              <option key={rack.id} value={rack.code}>
                {rack.code} · {rack.name}
              </option>
            ))}
          </select>
          <button type="submit" className="ti-btn ti-btn-outline-primary">
            Rack box
          </button>
        </form>
        {error ? (
          <p className="px-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </CatalogListShell>
    </RequireCrudPermission>
  );
}
