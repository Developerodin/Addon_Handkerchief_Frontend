'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { factoryRequest } from '@/shared/services/factoryApi';

interface Board {
  lastSuccessAt?: string | null;
  pendingSync?: number;
  rp03?: { rows: number; qty: number };
  rp07?: { rows: number; qty: number };
}

export default function ReportsPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    factoryRequest<Board>('/reports/board')
      .then(setBoard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Load failed'));
  }, []);

  const rows = board
    ? [
        ['Last sync', board.lastSuccessAt || 'Never'],
        ['Pending sync', String(board.pendingSync ?? 0)],
        ['Cutting rows', String(board.rp03?.rows ?? 0)],
        ['Cutting quantity', String(board.rp03?.qty ?? 0)],
      ]
    : [];

  return (
    <RequireCrudPermission path="Reports" action="read">
      <CatalogMasterFormPage seoTitle="Reports" title="Reports" listHref="/dashboards/main" listLabel="Dashboard" currentLabel="Reports">
        {error ? (
          <p className="p-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3">Measure</th>
                <th className="text-left p-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <td className="p-3">{label}</td>
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
