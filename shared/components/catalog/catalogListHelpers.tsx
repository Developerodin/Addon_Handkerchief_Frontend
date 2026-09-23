'use client';

import React from 'react';
import CatalogRowActions from '@/shared/components/catalog/CatalogRowActions';
import { CatalogSegment } from '@/shared/hooks/useCatalogCrud';
import { UiStatusBadge, UiTableColumn } from '@/shared/components/ui';

/** Build standard catalog table columns including optional status and sticky actions. */
export function buildCatalogTableColumns<T extends { id: string | number; status?: string }>(options: {
  dataColumns: UiTableColumn<T>[];
  segment: CatalogSegment;
  basePath: string;
  canUpdate?: boolean;
  canDelete?: boolean;
  canReplicate?: boolean;
  showStatus?: boolean;
  getEditHref?: (row: T) => string;
  onDelete: (id: string) => void;
  onReplicate?: (row: T) => void;
  replicateLoadingId?: string | null;
  deleteDisabled?: (row: T) => boolean;
  deleteLoading?: (row: T) => boolean;
}): UiTableColumn<T>[] {
  const cols = [...options.dataColumns];

  if (options.showStatus !== false) {
    cols.push({
      key: 'status',
      label: 'Status',
      render: (row) => <UiStatusBadge status={String(row.status || 'active')} />,
    });
  }

  if (options.canUpdate || options.canDelete || options.canReplicate) {
    cols.push({
      key: 'actions',
      label: 'Actions',
      align: 'right',
      sticky: 'right',
      render: (row) => (
        <CatalogRowActions
          segment={options.segment}
          editHref={options.getEditHref?.(row) ?? `${options.basePath}/edit/${row.id}`}
          onDelete={() => options.onDelete(String(row.id))}
          onReplicate={options.canReplicate && options.onReplicate ? () => options.onReplicate!(row) : undefined}
          replicateLoading={options.replicateLoadingId === row.id}
          deleteDisabled={options.deleteDisabled?.(row)}
          deleteLoading={options.deleteLoading?.(row)}
        />
      ),
    });
  }

  return cols;
}

/** Standard ERP list page help content block. */
export function catalogHelpBlock(title: string, description: string, bullets: string[]) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-lg mb-2">{title}</h4>
        <p className="text-gray-700">{description}</p>
      </div>
      <div>
        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
