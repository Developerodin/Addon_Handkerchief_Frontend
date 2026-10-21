'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { FabricStatGrid } from '@/shared/components/factory/FabricStatGrid';
import { factoryRequest, PageResult } from '@/shared/services/factoryApi';

interface RackBoardRow {
  code: string;
  name: string;
  count: number;
}

/**
 * Reads the total row count from a list endpoint.
 */
async function resultCount(path: string): Promise<number> {
  const data = await factoryRequest<PageResult<unknown>>(`${path}${path.includes('?') ? '&' : '?'}limit=1`);
  return data.totalResults || 0;
}

export default function LiveInventoryPage() {
  const [racks, setRacks] = useState<RackBoardRow[]>([]);
  const [stored, setStored] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    factoryRequest<{ results: RackBoardRow[] }>('/store/rack-board')
      .then((data) => setRacks(data.results || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load racks'));
    resultCount('/store/rolls?status=stored').then(setStored).catch(() => setStored(0));
  }, []);

  const onRacks = racks.reduce((sum, rack) => sum + (rack.count || 0), 0);

  return (
    <RequireCrudPermission path="Fabric / Live inventory" action="read">
      <CatalogMasterFormPage seoTitle="Live inventory" title="Live inventory" listHref="/store/racks" listLabel="Fabric storage" currentLabel="Live inventory">
        <div className="grid gap-4 p-4">
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <FabricStatGrid items={[{ label: 'On racks', value: onRacks }, { label: 'Stored rolls', value: stored }, { label: 'Racks', value: racks.length }]} />
          <table>
            <thead>
              <tr>
                <th>Rack</th>
                <th>Name</th>
                <th>Rolls</th>
              </tr>
            </thead>
            <tbody>
              {racks.map((rack) => (
                <tr key={rack.code}>
                  <td>{rack.code}</td>
                  <td>{rack.name}</td>
                  <td>{rack.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
