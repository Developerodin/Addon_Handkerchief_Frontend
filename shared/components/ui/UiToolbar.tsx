'use client';

import React from 'react';
import HelpIcon from '@/shared/components/HelpIcon';
import CatalogPageSizeSelect from '@/shared/components/catalog/CatalogPageSizeSelect';
import { UiButton } from './UiButton';
import { UiSearchInput } from './UiSearchInput';
import { cn } from './cn';

export interface UiToolbarProps {
  title: string;
  count: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  helpTitle?: string;
  helpContent?: React.ReactNode;
  canImport?: boolean;
  onImportClick?: () => void;
  importProgress?: number | null;
  onExportTemplate?: () => void;
  onExport?: () => void;
  canCreate?: boolean;
  addHref?: string;
  addLabel?: string;
  canDelete?: boolean;
  selectedCount?: number;
  onBulkDelete?: () => void;
  extraActions?: React.ReactNode;
  className?: string;
}

export function UiToolbar({
  title,
  count,
  searchQuery,
  onSearchChange,
  itemsPerPage,
  onItemsPerPageChange,
  helpTitle,
  helpContent,
  canImport,
  onImportClick,
  importProgress,
  onExportTemplate,
  onExport,
  canCreate,
  addHref,
  addLabel,
  canDelete,
  selectedCount = 0,
  onBulkDelete,
  extraActions,
  className,
}: UiToolbarProps) {
  return (
    <div className={cn('p-[10px] catalog-list-toolbar', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <div className="ui-page-accent" />
          <h1 className="ui-page-title">{title}</h1>
          <span className="ui-page-count">{count}</span>
          {helpContent ? <HelpIcon title={helpTitle || title} content={helpContent} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UiSearchInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <CatalogPageSizeSelect
            value={itemsPerPage}
            onChange={(value) => {
              onItemsPerPageChange(value);
            }}
          />
          {extraActions}
          {canImport && onImportClick ? (
            <UiButton variant="success" icon="ri-upload-2-line" onClick={onImportClick}>
              Import
            </UiButton>
          ) : null}
          {importProgress !== null && importProgress !== undefined ? (
            <div className="ui-import-progress">
              <div className="ui-import-progress__bar" style={{ width: `${importProgress}%` }} />
              <span className="ui-import-progress__label">{importProgress}%</span>
            </div>
          ) : null}
          {onExportTemplate ? (
            <UiButton variant="secondary" icon="ri-file-download-line" onClick={onExportTemplate}>
              Template
            </UiButton>
          ) : null}
          {onExport ? (
            <UiButton variant="primary" icon="ri-download-2-line" onClick={onExport}>
              Export
            </UiButton>
          ) : null}
          {canDelete && selectedCount > 0 && onBulkDelete ? (
            <UiButton variant="danger" icon="ri-delete-bin-line" onClick={onBulkDelete}>
              Delete ({selectedCount})
            </UiButton>
          ) : null}
          {canCreate && addHref ? (
            <UiButton variant="primary" href={addHref} icon="ri-add-line">
              {addLabel || `Add ${title}`}
            </UiButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default UiToolbar;
