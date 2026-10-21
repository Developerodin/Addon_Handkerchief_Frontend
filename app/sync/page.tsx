'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { factoryRequest } from '@/shared/services/factoryApi';

interface SyncStatus {
  pending?: number;
  quarantined?: number;
  waitingDependency?: number;
  failed?: number;
  cursor?: number;
  lastSuccessAt?: string | null;
  schemaVersion?: number;
  connected?: boolean;
}

export default function SyncPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    factoryRequest<SyncStatus>('/sync/status')
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : 'Load failed'));
  }, []);

  const rows = status
    ? [
        ['Connected', status.connected ? 'Yes' : 'No'],
        ['Cursor', String(status.cursor ?? 0)],
        ['Pending', String(status.pending ?? 0)],
        ['Waiting dependency', String(status.waitingDependency ?? 0)],
        ['Quarantined', String(status.quarantined ?? 0)],
        ['Failed', String(status.failed ?? 0)],
        ['Last success', status.lastSuccessAt || 'Never'],
        ['Schema', String(status.schemaVersion ?? '')],
      ]
    : [];

  return (
    <RequireCrudPermission path="Sync" action="read">
      <CatalogMasterFormPage seoTitle="Sync" title="Sync" listHref="/dashboards/main" listLabel="Dashboard" currentLabel="Sync">
        {error ? (
          <p className="p-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <th className="text-left p-3 font-medium">{label}</th>
                  <td className="p-3">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
