'use client';

import React, { useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { ClientOrderRow, ClientRow, factoryRequest } from '@/shared/services/factoryApi';

export default function ClientOrdersPage() {
  const orders = useFactoryList<ClientOrderRow>('/warehouse/orders');
  const clients = useFactoryList<ClientRow>('/warehouse/clients');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientId, setClientId] = useState('');
  const [targetBoxes, setTargetBoxes] = useState('1');
  const [error, setError] = useState('');

  return (
    <RequireCrudPermission path="Warehouse / Orders" action="read">
      <CatalogListShell
        seoTitle="Client orders"
        title="Client orders"
        count={orders.total}
        searchQuery={orders.search}
        onSearchChange={orders.setSearch}
        itemsPerPage={orders.limit}
        onItemsPerPageChange={orders.setLimit}
        isLoading={orders.loading}
        error={orders.error}
        rows={orders.rows}
        rowKey={(row) => row.id}
        currentPage={orders.page}
        totalPages={orders.totalPages}
        totalResults={orders.total}
        onPageChange={orders.setPage}
        columns={[
          { key: 'client', label: 'Client', render: (row) => row.clientName },
          { key: 'address', label: 'Address', render: (row) => row.clientAddress },
          { key: 'boxes', label: 'Target boxes', render: (row) => row.targetBoxes },
          { key: 'status', label: 'Status', render: (row) => row.status },
        ]}
      >
        <form
          className="grid gap-3 p-4 border-b border-gray-100 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              await factoryRequest('/warehouse/clients', { method: 'POST', body: JSON.stringify({ name, address }) });
              setName('');
              setAddress('');
              await clients.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Client failed');
            }
          }}
        >
          <input aria-label="Client name" className="form-control" placeholder="Client name" required value={name} onChange={(event) => setName(event.target.value)} />
          <input aria-label="Client address" className="form-control" placeholder="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
          <button type="submit" className="ti-btn ti-btn-outline-primary w-fit">
            Save client
          </button>
        </form>
        <form
          className="grid gap-3 p-4 border-b border-gray-100"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              await factoryRequest('/warehouse/orders', {
                method: 'POST',
                body: JSON.stringify({ clientId, targetBoxes: Number(targetBoxes) }),
              });
              await orders.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Order failed');
            }
          }}
        >
          <label className="form-label" htmlFor="clientId">
            Client
          </label>
          <select id="clientId" aria-label="Client" className="form-control" required value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">Select client</option>
            {clients.rows.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} · {client.address}
              </option>
            ))}
          </select>
          <label className="form-label" htmlFor="targetBoxes">
            Target boxes
          </label>
          <input id="targetBoxes" aria-label="Target boxes" className="form-control" type="number" min={1} value={targetBoxes} onChange={(event) => setTargetBoxes(event.target.value)} />
          <button type="submit" className="ti-btn ti-btn-primary w-fit">
            Open order
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
