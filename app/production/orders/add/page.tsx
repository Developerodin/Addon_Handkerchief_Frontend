'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
import { factoryRequest, itemScopeId, listScopeRevisions, routeFromItem, ScopeRevision } from '@/shared/services/factoryApi';
import { getProductById, listProducts, ProductListItem } from '@/shared/services/productService';

export default function ReleaseOrderPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [itemId, setItemId] = useState('');
  const [productionType, setProductionType] = useState('normal');
  const [revisions, setRevisions] = useState<ScopeRevision[]>([]);
  const [revisionId, setRevisionId] = useState('');
  const [unpublished, setUnpublished] = useState(false);
  const [targetQty, setTargetQty] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [orderNote, setOrderNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listProducts({ page: 1, limit: 200 })
      .then((data) => setItems(data.results || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load items'));
  }, []);

  /**
   * Route and revision come from the item and its published scope.
   */
  const onItem = async (nextId: string) => {
    setItemId(nextId);
    setRevisions([]);
    setRevisionId('');
    setUnpublished(false);
    if (!nextId) return;
    const product = await getProductById(nextId);
    if (!product) {
      setError('Item not found');
      return;
    }
    const route = routeFromItem(String(product.productionType || ''));
    setProductionType(route);
    try {
      const data = await listScopeRevisions(itemScopeId({ ...product, id: nextId, productionType: route }));
      const rows = data.results || [];
      setRevisions(rows);
      setRevisionId(rows[rows.length - 1]?.id || '');
      setUnpublished(rows.length === 0);
    } catch (err) {
      setUnpublished(true);
      setError(err instanceof Error ? err.message : 'No published revision');
    }
  };

  return (
    <RequireCrudPermission path="Production / Orders" action="create">
      <CatalogMasterFormPage
        seoTitle="Release order"
        title="Release production order"
        listHref="/production/orders"
        listLabel="Production orders"
        currentLabel="Release"
      >
        <form
          className="grid gap-4 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError('');
            try {
              await factoryRequest('/production/orders', {
                method: 'POST',
                body: JSON.stringify({
                  itemId: itemId || undefined,
                  productionType,
                  revisionId,
                  targetQty: Number(targetQty),
                  priority,
                  orderNote,
                }),
              });
              router.push('/production/orders');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Release failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="form-label" htmlFor="itemId">
            Item
          </label>
          <select id="itemId" aria-label="Item" className="form-control" required value={itemId} onChange={(event) => onItem(event.target.value)}>
            <option value="">Select item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <label className="form-label" htmlFor="productionType">
            Route
          </label>
          <select id="productionType" aria-label="Route" className="form-control" value={productionType} disabled>
            <option value="normal">Normal</option>
            <option value="embroidery">Embroidery</option>
            <option value="sticker">Sticker</option>
          </select>
          <label className="form-label" htmlFor="revisionId">
            Revision
          </label>
          <select id="revisionId" aria-label="Revision" className="form-control" required value={revisionId} onChange={(event) => setRevisionId(event.target.value)}>
            <option value="">{unpublished ? 'Publish the item first' : 'Select revision'}</option>
            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                {revision.sequence} · {revision.reason || revision.id}
              </option>
            ))}
          </select>
          <label className="form-label" htmlFor="targetQty">
            Target quantity
          </label>
          <input id="targetQty" aria-label="Target quantity" className="form-control" type="number" required min={1} value={targetQty} onChange={(event) => setTargetQty(event.target.value)} />
          <label className="form-label" htmlFor="priority">
            Priority
          </label>
          <select id="priority" aria-label="Priority" className="form-control" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option>Urgent</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <label className="form-label" htmlFor="orderNote">
            Order note
          </label>
          <textarea id="orderNote" aria-label="Order note" className="form-control" rows={2} value={orderNote} onChange={(event) => setOrderNote(event.target.value)} />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <UiFormFooter submitLabel="Release" isLoading={loading} onCancel={() => router.push('/production/orders')} />
        </form>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
