'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { factoryRequest, GradeRow } from '@/shared/services/factoryApi';

export default function GradesPage() {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  /**
   * Loads grade codes. Renames do not rewrite old check results.
   */
  const load = async () => {
    const rows = await factoryRequest<GradeRow[]>('/quality/grades');
    setGrades(rows);
    setNames(Object.fromEntries(rows.map((row) => [row.code, row.name])));
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Load failed'));
  }, []);

  return (
    <RequireCrudPermission path="Quality / Grades" action="read">
      <CatalogMasterFormPage seoTitle="Grades" title="Grades" listHref="/dashboards/main" listLabel="Dashboard" currentLabel="Grades">
        <div className="grid gap-3 p-4">
          {grades.map((grade) => (
            <form
              key={grade.code}
              className="grid gap-2 md:grid-cols-[8rem_1fr_auto] items-center"
              onSubmit={async (event) => {
                event.preventDefault();
                setError('');
                try {
                  await factoryRequest(`/quality/grades/${encodeURIComponent(grade.code)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ name: names[grade.code] }),
                  });
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Rename failed');
                }
              }}
            >
              <span className="text-sm font-medium">{grade.code}</span>
              <input
                aria-label={`Name for ${grade.code}`}
                className="form-control"
                value={names[grade.code] || ''}
                onChange={(event) => setNames((prev) => ({ ...prev, [grade.code]: event.target.value }))}
              />
              <button type="submit" className="ti-btn ti-btn-outline-primary">
                Rename
              </button>
            </form>
          ))}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
