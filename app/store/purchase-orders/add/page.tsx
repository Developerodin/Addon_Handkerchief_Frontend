'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { factoryRequest, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { FabricCatalog, listFabricCatalogs } from '@/shared/services/fabricCatalogService';
import { FabricSupplier, listFabricSuppliers } from '@/shared/services/fabricSupplierService';
import { fabricMeasurementApi, FabricMeasurementLookup } from '@/shared/services/fabricLookupService';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { PoSavePayload } from './purchaseOrderFormModel';

/**
 * Loads every page of a catalog list. The PO picker needs the full supplier fabric set.
 */
async function loadAll<T>(fetchPage: (page: number) => Promise<{ results: T[]; totalPages: number }>): Promise<T[]> {
  const first = await fetchPage(1);
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, (first.totalPages || 1) - 1) }, (_, index) => fetchPage(index + 2))
  );
  return [first, ...pages].flatMap((page) => page.results || []);
}

export default function AddPurchaseOrderPage() {
  const router = useRouter();
  const savedId = useRef<string | null>(null);
  const [fabrics, setFabrics] = useState<FabricCatalog[]>([]);
  const [suppliers, setSuppliers] = useState<FabricSupplier[]>([]);
  const [units, setUnits] = useState<FabricMeasurementLookup[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll((page) => listFabricCatalogs({ limit: 200, page, status: 'active' }))
      .then(setFabrics)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load fabrics'));
    loadAll((page) => listFabricSuppliers({ limit: 200, page, status: 'active' }))
      .then(setSuppliers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load suppliers'));
    loadAll((page) => fabricMeasurementApi.list({ limit: 200, page, status: 'active' }))
      .then((rows) => setUnits([...rows].sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load units'));
  }, []);

  /**
   * Creates or updates the draft, then submits it when the user raises the PO.
   */
  const onSave = async (payload: PoSavePayload, mode: 'draft' | 'raise') => {
    setSaving(true);
    setError('');
    try {
      const po = savedId.current
        ? await factoryRequest<PurchaseOrderRow>(`/store/purchase-orders/${savedId.current}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
        : await factoryRequest<PurchaseOrderRow>('/store/purchase-orders', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
      savedId.current = po.id;
      if (mode === 'raise') {
        await factoryRequest(`/store/purchase-orders/${po.id}/submit`, { method: 'POST' });
        toast.success('Purchase order submitted to supplier');
        router.push('/store/purchase-orders');
        return;
      }
      toast.success('Draft saved');
      router.push('/store/purchase-orders/drafts');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireCrudPermission path="Fabric / Purchase orders" action="create">
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="New Purchase Order"
        title="New Purchase Order"
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
        <PurchaseOrderForm
          fabrics={fabrics}
          suppliers={suppliers}
          units={units}
          saving={saving}
          onSave={onSave}
          onCancel={() => router.push('/store/purchase-orders')}
        />
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
