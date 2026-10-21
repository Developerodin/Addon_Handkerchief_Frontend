'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { FabricStatGrid, StatItem } from '@/shared/components/factory/FabricStatGrid';
import { factoryRequest, PageResult } from '@/shared/services/factoryApi';

const STATUSES = ['received', 'stored', 'lot-held', 'issued', 'on-floor', 'returned-to-vendor'];

/**
 * Reads the total row count from a list endpoint.
 */
async function resultCount(path: string): Promise<number> {
  const data = await factoryRequest<PageResult<unknown>>(`${path}${path.includes('?') ? '&' : '?'}limit=1`);
  return data.totalResults || 0;
}

export default function FabricStockReportPage() {
  const [items, setItems] = useState<StatItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all(STATUSES.map(async (status) => ({ label: status, value: await resultCount(`/store/rolls?status=${status}`) })))
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load stock'));
  }, []);

  return (
    <RequireCrudPermission path="Fabric / Stock report" action="read">
      <CatalogMasterFormPage seoTitle="Fabric stock report" title="Fabric stock report" listHref="/store/reports/live-inventory" listLabel="Live inventory" currentLabel="Fabric stock report">
        <div className="p-4">
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <FabricStatGrid items={items} />
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
