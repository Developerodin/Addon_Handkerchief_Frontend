'use client';

import React, { RefObject } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { CatalogSegment } from '@/shared/hooks/useCatalogCrud';
import {
  UiListEmpty,
  UiListError,
  UiListLoading,
  UiPagination,
  UiTable,
  UiTableColumn,
  UiToolbar,
} from '@/shared/components/ui';

export interface CatalogListShellProps<T> {
  seoTitle: string;
  title: string;
  segment?: CatalogSegment;
  count: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  helpContent?: React.ReactNode;
  canImport?: boolean;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  onImportClick?: () => void;
  onImportChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importProgress?: number | null;
  onExportTemplate?: () => void;
  onExport?: () => void;
  canCreate?: boolean;
  addHref?: string;
  addLabel?: string;
  canDelete?: boolean;
  selectedCount?: number;
  onBulkDelete?: () => void;
  extraToolbarActions?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  rows: T[];
  columns: UiTableColumn<T>[];
  rowKey: (row: T) => string;
  selectable?: {
    selectedIds: string[];
    selectAll: boolean;
    onSelectAll: () => void;
    onSelect: (id: string) => void;
    getRowId: (row: T) => string;
  };
  onRowClick?: (row: T) => void;
  currentPage: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  emptyIcon?: string;
  emptyAddLabel?: string;
  children?: React.ReactNode;
}

export function CatalogListShell<T>({
  seoTitle,
  title,
  count,
  searchQuery,
  onSearchChange,
  itemsPerPage,
  onItemsPerPageChange,
  helpContent,
  canImport,
  fileInputRef,
  onImportClick,
  onImportChange,
  importProgress,
  onExportTemplate,
  onExport,
  canCreate,
  addHref,
  addLabel,
  canDelete,
  selectedCount,
  onBulkDelete,
  extraToolbarActions,
  isLoading,
  error,
  rows,
  columns,
  rowKey,
  selectable,
  onRowClick,
  currentPage,
  totalPages,
  totalResults,
  onPageChange,
  emptyIcon,
  emptyAddLabel,
  children,
}: CatalogListShellProps<T>) {
  return (
    <div className="main-content !p-[10px]">
      <Seo title={seoTitle} />
      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card relative">
        <UiToolbar
          title={title}
          count={count}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          helpTitle={title}
          helpContent={helpContent}
          canImport={canImport}
          onImportClick={onImportClick}
          importProgress={importProgress}
          onExportTemplate={onExportTemplate}
          onExport={onExport}
          canCreate={canCreate}
          addHref={addHref}
          addLabel={addLabel}
          canDelete={canDelete}
          selectedCount={selectedCount}
          onBulkDelete={onBulkDelete}
          extraActions={extraToolbarActions}
        />
        {fileInputRef && onImportChange ? (
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={onImportChange} />
        ) : null}

        {children}

        {isLoading ? (
          <UiListLoading />
        ) : error ? (
          <UiListError message={error} />
        ) : rows.length === 0 ? (
          <UiListEmpty
            icon={emptyIcon}
            canCreate={canCreate}
            addHref={addHref}
            addLabel={emptyAddLabel || addLabel}
          />
        ) : (
          <UiTable
            columns={columns}
            rows={rows}
            rowKey={rowKey}
            selectable={selectable}
            onRowClick={onRowClick}
          />
        )}

        {!isLoading && !error && rows.length > 0 && (
          <UiPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalResults}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
}

export default CatalogListShell;
