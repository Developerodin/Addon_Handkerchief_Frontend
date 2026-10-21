'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { FabricStatGrid, StatItem } from '@/shared/components/factory/FabricStatGrid';
import { factoryRequest, PageResult } from '@/shared/services/factoryApi';

const STATUSES = ['Draft', 'Submitted to Vendor', 'In Transit', 'Partially Received', 'Received', 'Return to Vendor'];

/**
 * Reads the total row count from a list endpoint.
 */
async function resultCount(path: string): Promise<number> {
  const data = await factoryRequest<PageResult<unknown>>(`${path}${path.includes('?') ? '&' : '?'}limit=1`);
  return data.totalResults || 0;
}

export default function PoAnalyticsPage() {
  const [items, setItems] = useState<StatItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all(
      STATUSES.map(async (status) => ({
        label: status,
        value: await resultCount(`/store/purchase-orders?status=${encodeURIComponent(status)}`),
      }))
    )
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load purchase orders'));
  }, []);

  return (
    <RequireCrudPermission path="Fabric / PO analytics" action="read">
      <CatalogMasterFormPage seoTitle="PO analytics" title="PO analytics" listHref="/store/purchase-orders" listLabel="All PO" currentLabel="PO analytics">
        <div className="p-4">
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <FabricStatGrid items={items} />
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
