'use client';

import React, { useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { UiButton, UiIconButton, UiStatusBadge } from '@/shared/components/ui';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { DrawerSection, DrawerStat, FactoryDrawer } from '@/shared/components/factory/FactoryDrawer';
import { OrderLogPanel } from '@/shared/components/factory/OrderLogPanel';
import { factoryRequest, itemScopeId, listScopeRevisions, OrderDetail, ProductionOrderRow, ScopeRevision } from '@/shared/services/factoryApi';
import { getProductById } from '@/shared/services/productService';

export default function ProductionOrdersPage() {
  const [status, setStatus] = useState('');
  const list = useFactoryList<ProductionOrderRow>('/production/orders', { status });
  const [order, setOrder] = useState<ProductionOrderRow | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [logOrderId, setLogOrderId] = useState('');
  const counts = {
    released: list.rows.filter((row) => row.status === 'released').length,
    progress: list.rows.filter((row) => row.status === 'in-progress').length,
    closed: list.rows.filter((row) => row.status === 'closed').length,
    amended: list.rows.filter((row) => row.status === 'amended').length,
  };
  const [revisions, setRevisions] = useState<ScopeRevision[]>([]);
  const [revisionId, setRevisionId] = useState('');
  const [remainingQty, setRemainingQty] = useState('');
  const [error, setError] = useState('');

  /**
   * Loads published revisions for the order's item so amend cannot invent an id.
   */
  const openAmend = async (row: ProductionOrderRow) => {
    setOrder(row);
    setRevisionId('');
    setRevisions([]);
    setError('');
    if (!row.itemId) {
      setError('This order has no item, so there is no published revision to pick');
      return;
    }
    const product = await getProductById(row.itemId);
    if (!product) {
      setError('Item not found');
      return;
    }
    try {
      const data = await listScopeRevisions(itemScopeId({ ...product, id: row.itemId, productionType: row.productionType }));
      setRevisions((data.results || []).filter((revision) => revision.id !== row.revisionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No published revision');
    }
  };

  return (
    <RequireCrudPermission path="Production / Orders" action="read">
      <CatalogListShell
        seoTitle="Production orders"
        title="Production orders"
        count={list.total}
        searchQuery={list.search}
        onSearchChange={list.setSearch}
        itemsPerPage={list.limit}
        onItemsPerPageChange={list.setLimit}
        canCreate
        addHref="/production/orders/add"
        addLabel="Release order"
        isLoading={list.loading}
        error={list.error}
        rows={list.rows}
        rowKey={(row) => row.id}
        currentPage={list.page}
        totalPages={list.totalPages}
        totalResults={list.total}
        onPageChange={list.setPage}
        extraToolbarActions={
          <select aria-label="Status" className="form-control w-auto" value={status} onChange={(event) => { setStatus(event.target.value); list.setPage(1); }}>
            <option value="">All statuses</option>
            <option value="released">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="amended">Amended</option>
            <option value="closed">Completed</option>
          </select>
        }
        columns={[
          { key: 'id', label: 'Order', render: (row) => row.id.slice(-6) },
          { key: 'route', label: 'Route', render: (row) => row.productionType },
          { key: 'floor', label: 'Floor', render: (row) => row.currentFloor || '—' },
          { key: 'target', label: 'Target', render: (row) => row.targetQty },
          { key: 'status', label: 'Status', render: (row) => <UiStatusBadge status={row.status} /> },
          {
            key: 'priority',
            label: 'Priority',
            render: (row) => {
              const tone = row.priority === 'Urgent' || row.priority === 'High' ? 'inactive' : row.priority === 'Low' ? 'active' : 'pending';
              return <span className={`ui-status-badge ui-status-badge--${tone}`}>{row.priority || 'Medium'}</span>;
            },
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                <UiIconButton
                  icon="ri-eye-line"
                  tone="view"
                  title="View"
                  aria-label="View order"
                  onClick={async () => {
                    setError('');
                    try {
                      setDetail(await factoryRequest<OrderDetail>(`/production/orders/${row.id}`));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not open the order');
                    }
                  }}
                />
                <UiIconButton icon="ri-file-list-3-line" tone="view" title="Logs" aria-label="Order logs" onClick={() => setLogOrderId(row.id)} />
                <UiIconButton icon="ri-edit-line" tone="edit" title="Amend" aria-label="Amend order" onClick={() => openAmend(row)} />
              </div>
            ),
          },
        ]}
      >
        {order ? (
          <form
            className="grid gap-3 p-4 border-b border-gray-100"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              try {
                await factoryRequest(`/production/orders/${order.id}/amend`, {
                  method: 'POST',
                  body: JSON.stringify({ revisionId, remainingQty: Number(remainingQty) }),
                });
                setOrder(null);
                await list.reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Amend failed');
              }
            }}
          >
            <p className="text-sm font-medium">Move unfinished quantity of {order.revisionId} onto a new revision</p>
            <label className="form-label" htmlFor="amendRevision">
              New revision
            </label>
            <select id="amendRevision" aria-label="New revision" className="form-control" value={revisionId} onChange={(event) => setRevisionId(event.target.value)} required>
              <option value="">{revisions.length ? 'Select revision' : 'Publish another revision first'}</option>
              {revisions.map((revision) => (
                <option key={revision.id} value={revision.id}>
                  {revision.sequence} · {revision.reason || revision.id}
                </option>
              ))}
            </select>
            <label className="form-label" htmlFor="remainingQty">
              Remaining quantity
            </label>
            <input id="remainingQty" aria-label="Remaining quantity" className="form-control" type="number" value={remainingQty} onChange={(event) => setRemainingQty(event.target.value)} required />
            <UiButton type="submit" variant="primary">
              Amend
            </UiButton>
          </form>
        ) : null}
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Order counts">
          {[
            ['Pending', counts.released],
            ['In progress', counts.progress],
            ['Completed', counts.closed],
            ['Amended', counts.amended],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border-2 border-gray-300 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">{label}</p>
              <p className="text-sm font-bold text-gray-800">{value}</p>
            </div>
          ))}
        </div>
        {error ? (
          <p className="px-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </CatalogListShell>
      <FactoryDrawer
        title={detail ? `${detail.order.productionType} order` : 'Order'}
        subtitle={detail?.order.revisionId}
        status={detail?.order.status}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              <DrawerStat label="Target" value={detail.order.targetQty} />
              <DrawerStat label="Floor" value={detail.order.currentFloor || '—'} />
              <DrawerStat label="Priority" value={detail.order.priority || 'Medium'} />
            </div>
            <DrawerSection title="Floors">
              <table>
                <thead>
                  <tr>
                    <th>Floor</th>
                    <th>Completed</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.order.floors || []).map((floor) => (
                    <tr key={`${floor.sortOrder}-${floor.floor}`}>
                      <td>{floor.name || floor.floor}</td>
                      <td>{floor.completedQty}</td>
                      <td>{detail.order.targetQty}</td>
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
                  {(detail.order.segments || []).map((segment) => (
                    <tr key={segment.revisionId}>
                      <td>{segment.revisionId}</td>
                      <td>{segment.qty}</td>
                      <td>{segment.completedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DrawerSection>
            <DrawerSection title="Floor completions">
              <table>
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Qty</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.completions || []).map((row) => (
                    <tr key={row.id}>
                      <td>{row.stage}</td>
                      <td>{row.qty}</td>
                      <td>{row.operatorId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DrawerSection>
            <DrawerSection title="Bundles">
              <table>
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Qty</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.bundles || []).map((row) => (
                    <tr key={row.id}>
                      <td>#{row.number}</td>
                      <td>{row.qty}</td>
                      <td>{row.closed ? 'Closed' : 'Open'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DrawerSection>
          </>
        ) : null}
      </FactoryDrawer>
      <FactoryDrawer title="Order logs" subtitle="Who did what on this order" open={Boolean(logOrderId)} wide onClose={() => setLogOrderId('')}>
        {logOrderId ? <OrderLogPanel orderId={logOrderId} /> : null}
      </FactoryDrawer>
    </RequireCrudPermission>
  );
}
