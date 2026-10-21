'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { FabricStatGrid, StatItem } from '@/shared/components/factory/FabricStatGrid';
import { factoryRequest, PageResult } from '@/shared/services/factoryApi';

/**
 * Reads the total row count from a list endpoint.
 */
async function resultCount(path: string): Promise<number> {
  const data = await factoryRequest<PageResult<unknown>>(`${path}${path.includes('?') ? '&' : '?'}limit=1`);
  return data.totalResults || 0;
}

export default function FabricAnalyticsPage() {
  const [items, setItems] = useState<StatItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      resultCount('/store/lots?qcStatus=pending'),
      resultCount('/store/lots?qcStatus=passed'),
      resultCount('/store/lots?qcStatus=held'),
      resultCount('/store/receipts'),
      resultCount('/store/vendor-returns'),
    ])
      .then(([pending, passed, held, received, returns]) => {
        setItems([
          { label: 'QC pending', value: pending },
          { label: 'QC passed', value: passed },
          { label: 'QC held', value: held },
          { label: 'PO received', value: received },
          { label: 'Vendor returns', value: returns },
        ]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load fabric analytics'));
  }, []);

  return (
    <RequireCrudPermission path="Fabric / Fabric analytics" action="read">
      <CatalogMasterFormPage seoTitle="Fabric analytics" title="Fabric analytics" listHref="/store/reports/stock" listLabel="Fabric stock report" currentLabel="Fabric analytics">
        <div className="p-4">
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <FabricStatGrid items={items} />
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
