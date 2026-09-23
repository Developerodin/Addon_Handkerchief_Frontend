'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Seo from '@/shared/layout-components/seo/seo';
import CatalogRowActions from '@/shared/components/catalog/CatalogRowActions';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import {
  UiListEmpty,
  UiListError,
  UiListLoading,
  UiPagination,
  UiStatusBadge,
  UiTable,
  UiTableColumn,
  UiToolbar,
} from '@/shared/components/ui';
import type { CatalogListColumn, CatalogListConfig } from '@/shared/components/catalog/catalogListTypes';

export type { CatalogListApi, CatalogListColumn, CatalogListConfig } from '@/shared/components/catalog/catalogListTypes';

function defaultExportRow<T extends { id: string; name?: string; status?: string }>(
  row: T,
  columns: CatalogListColumn<T>[]
): Record<string, string | number> {
  const out: Record<string, string | number> = {
    ID: row.id,
    Name: row.name || '',
    Status: row.status || 'active',
  };
  columns.forEach((col) => {
    if (col.exportValue) out[col.label] = col.exportValue(row);
  });
  return out;
}

export function CatalogListPage<T extends { id: string; name?: string; status?: string }>({
  config,
}: {
  config: CatalogListConfig<T>;
}) {
  const showName = config.showNameColumn !== false;
  const showStatus = config.showStatusColumn !== false;
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud(config.segment);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [replicateLoadingId, setReplicateLoadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRows = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await config.api.list({ page, limit, search });
      setRows(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to fetch ${config.title}`);
      setRows([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedIds.length === 0) setSelectAll(false);
  }, [selectedIds]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(rows.map((r) => r.id));
      setSelectAll(true);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSelectAll(false);
  };

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm(`Delete this ${config.title.toLowerCase()}?`)) return;
    try {
      await config.api.remove(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success(`${config.title} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete() || selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected ${config.title.toLowerCase()}(s)?`)) return;
    let hasError = false;
    const results = await Promise.all(
      selectedIds.map(async (id) => {
        try {
          await config.api.remove(id);
          return id;
        } catch {
          hasError = true;
          return null;
        }
      })
    );
    const successful = results.filter((id): id is string => id !== null);
    setRows((prev) => prev.filter((row) => !successful.includes(row.id)));
    setSelectedIds([]);
    setSelectAll(false);
    if (hasError) toast.error('Some rows could not be deleted');
    else toast.success('Selected rows deleted');
  };

  const handleReplicate = async (row: T) => {
    if (!config.onReplicate) return;
    try {
      setReplicateLoadingId(row.id);
      await config.onReplicate(row);
    } finally {
      setReplicateLoadingId(null);
    }
  };

  const handleExportTemplate = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(
        config.importTemplateRows?.length ? config.importTemplateRows : [config.importTemplateRow]
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${config.title} Template`);
      XLSX.writeFile(wb, `${config.segment.replace(/-/g, '_')}_import_template.xlsx`);
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    const data = await config.api.list({ page: 1, limit: 100000 });
    const exportData = data.results.map((row) =>
      config.mapExportRow ? config.mapExportRow(row) : defaultExportRow(row, config.columns)
    );
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.title);
    XLSX.writeFile(wb, `${config.segment}_export.xlsx`);
    toast.success('Export complete');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading(`Importing ${config.title}...`);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
          const allData = await config.api.list({ page: 1, limit: 100000 });
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < jsonData.length; i++) {
            const importRow = jsonData[i];
            try {
              const name = String(importRow.Name || importRow.name || '').trim();
              if (!name && showName) throw new Error('Name required');
              const payload = config.mapImportRow(importRow);
              let existingId = String(importRow.ID || importRow.id || '').trim();
              if (!existingId && config.findExisting) {
                existingId = config.findExisting(allData.results, importRow)?.id || '';
              }
              if (!existingId && showName) {
                const found = allData.results.find(
                  (row) => (config.getRowName?.(row) || row.name || '').trim().toLowerCase() === name.toLowerCase()
                );
                existingId = found?.id || '';
              }
              if (existingId) await config.api.update(existingId, payload);
              else await config.api.create(payload);
              successCount++;
            } catch {
              errorCount++;
            }
            setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount) toast.success(`Imported/updated ${successCount} row(s)`);
          if (errorCount) toast.error(`Failed ${errorCount} row(s)`);
          fetchRows(currentPage, itemsPerPage, searchQuery);
        } catch {
          setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      setImportProgress(null);
      toast.error('Import failed', { id: loadingToast });
    }
  };

  const getName = (row: T) => config.getRowName?.(row) || row.name || '—';

  const tableColumns: UiTableColumn<T>[] = [];

  if (showName) {
    tableColumns.push({
      key: 'name',
      label: 'Name',
      render: (row) => <span className="font-bold text-gray-900">{getName(row)}</span>,
    });
  }

  config.columns.forEach((col) => {
    tableColumns.push({
      key: col.key,
      label: col.label,
      align: col.align,
      sticky: col.sticky,
      cellClassName: col.cellClassName,
      render: (row) => (col.render ? col.render(row) : '—'),
    });
  });

  if (showStatus) {
    tableColumns.push({
      key: 'status',
      label: 'Status',
      render: (row) => <UiStatusBadge status={String(row.status || 'active')} />,
    });
  }

  if (canUpdate || canDelete || (canCreate && config.replicate)) {
    tableColumns.push({
      key: 'actions',
      label: 'Actions',
      align: 'right',
      sticky: 'right',
      render: (row) => (
        <CatalogRowActions
          segment={config.segment}
          editHref={`${config.basePath}/edit/${row.id}`}
          onDelete={() => handleDelete(row.id)}
          onReplicate={config.replicate && config.onReplicate ? () => handleReplicate(row) : undefined}
          replicateLoading={replicateLoadingId === row.id}
        />
      ),
    });
  }

  const helpContent = config.helpContent ?? (
    <div>
      <p className="text-gray-700">{config.description}</p>
    </div>
  );

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title={config.title} />
      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <UiToolbar
          title={config.title}
          count={totalResults}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
          helpTitle={config.title}
          helpContent={helpContent}
          canImport={canImport}
          onImportClick={() => fileInputRef.current?.click()}
          importProgress={importProgress}
          onExportTemplate={handleExportTemplate}
          onExport={handleExport}
          canCreate={canCreate}
          addHref={`${config.basePath}/add`}
          addLabel={`Add ${config.title}`}
          canDelete={canDelete && config.selectable}
          selectedCount={selectedIds.length}
          onBulkDelete={handleDeleteSelected}
        />
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />

        {isLoading ? (
          <UiListLoading />
        ) : error ? (
          <UiListError message={error} />
        ) : rows.length === 0 ? (
          <UiListEmpty
            icon={config.emptyIcon}
            canCreate={canCreate}
            addHref={`${config.basePath}/add`}
            addLabel={`Add First ${config.title}`}
          />
        ) : (
          <UiTable
            columns={tableColumns}
            rows={rows}
            rowKey={(row) => row.id}
            selectable={
              config.selectable && canDelete
                ? {
                    selectedIds,
                    selectAll,
                    onSelectAll: handleSelectAll,
                    onSelect: handleSelect,
                    getRowId: (row) => row.id,
                  }
                : undefined
            }
          />
        )}

        {!isLoading && !error && rows.length > 0 && (
          <UiPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalResults}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}

export default CatalogListPage;
