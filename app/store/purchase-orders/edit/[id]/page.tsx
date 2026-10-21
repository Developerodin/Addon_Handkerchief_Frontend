'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { factoryRequest, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { FabricCatalog, listFabricCatalogs } from '@/shared/services/fabricCatalogService';
import { FabricSupplier, listFabricSuppliers } from '@/shared/services/fabricSupplierService';
import { fabricMeasurementApi, FabricMeasurementLookup } from '@/shared/services/fabricLookupService';
import { PurchaseOrderForm } from '../../add/PurchaseOrderForm';
import { formSeedFromOrder, PoSavePayload } from '../../add/purchaseOrderFormModel';

const EDITABLE = new Set(['Draft', 'Submitted to Vendor']);

/**
 * Loads every page of a catalog list so the edit form can match supplier and unit.
 */
async function loadAll<T>(fetchPage: (page: number) => Promise<{ results: T[]; totalPages: number }>): Promise<T[]> {
  const first = await fetchPage(1);
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, (first.totalPages || 1) - 1) }, (_, index) => fetchPage(index + 2))
  );
  return [first, ...pages].flatMap((page) => page.results || []);
}

export default function EditPurchaseOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrderRow | null>(null);
  const [fabrics, setFabrics] = useState<FabricCatalog[]>([]);
  const [suppliers, setSuppliers] = useState<FabricSupplier[]>([]);
  const [units, setUnits] = useState<FabricMeasurementLookup[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      factoryRequest<PurchaseOrderRow>(`/store/purchase-orders/${params.id}`),
      loadAll((page) => listFabricCatalogs({ limit: 200, page, status: 'active' })),
      loadAll((page) => listFabricSuppliers({ limit: 200, page, status: 'active' })),
      loadAll((page) => fabricMeasurementApi.list({ limit: 200, page, status: 'active' })),
    ])
      .then(([po, fabricRows, supplierRows, unitRows]) => {
        if (cancelled) return;
        setOrder(po);
        setFabrics(fabricRows);
        setSuppliers(supplierRows);
        setUnits([...unitRows].sort((a, b) => a.name.localeCompare(b.name)));
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the purchase order');
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  /**
   * Writes the same payload as the add form. Raise is only offered while the order is a draft.
   */
  const onSave = async (payload: PoSavePayload, mode: 'draft' | 'raise') => {
    if (!order) return;
    setSaving(true);
    setError('');
    try {
      await factoryRequest<PurchaseOrderRow>(`/store/purchase-orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (mode === 'raise') {
        await factoryRequest(`/store/purchase-orders/${order.id}/submit`, { method: 'POST' });
        toast.success('Purchase order submitted to supplier');
        router.push('/store/purchase-orders');
        return;
      }
      toast.success(order.status === 'Draft' ? 'Draft saved' : 'Purchase order saved');
      router.push(order.status === 'Draft' ? '/store/purchase-orders/drafts' : '/store/purchase-orders');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const editable = order ? EDITABLE.has(order.status) : false;

  return (
    <RequireCrudPermission path="Fabric / Purchase orders" action="update">
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle={order ? `Edit ${order.number}` : 'Edit purchase order'}
        title={order ? `Edit ${order.number}` : 'Edit purchase order'}
        listHref="/store/purchase-orders"
        listLabel="All PO"
        showBreadcrumb={false}
        headerActions={
          <Link
            href="/store/purchase-orders"
            className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 shadow-sm hover:bg-gray-50"
            aria-label="Back to purchase orders"
          >
            <i className="ri-arrow-left-line text-xs" aria-hidden />
            Back
          </Link>
        }
      >
        {error ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {!ready && !error ? <p className="text-sm text-gray-500">Loading purchase order…</p> : null}
        {order && !editable ? (
          <p className="text-sm text-red-600" role="alert">
            {order.number} can no longer be edited.
          </p>
        ) : null}
        {order && editable && ready ? (
          <PurchaseOrderForm
            key={order.id}
            fabrics={fabrics}
            suppliers={suppliers}
            units={units}
            saving={saving}
            seed={formSeedFromOrder(order, suppliers, units)}
            allowRaise={order.status === 'Draft'}
            onSave={onSave}
            onCancel={() => router.push('/store/purchase-orders')}
          />
        ) : null}
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
