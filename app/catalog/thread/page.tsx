'use client';

import React, { useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import {
  ThreadCatalog,
  createThreadCatalog,
  deleteThreadCatalog,
  listThreadCatalogs,
  updateThreadCatalog,
} from '@/shared/services/threadCatalogService';

interface ExcelRow {
  ID?: string;
  'Thread code'?: string;
  'Thread type'?: string;
  Status?: string;
}

const excelColWidths = [{ wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];

/**
 * Maps a catalog row to an Excel export record.
 * @param thread - Catalog row
 */
const toExportRow = (thread: ThreadCatalog) => ({
  ID: thread.id,
  'Thread code': thread.threadCode,
  'Thread type': thread.threadType,
  Status: thread.status || 'active',
});

const dataColumns: UiTableColumn<ThreadCatalog>[] = [
  {
    key: 'threadCode',
    label: 'Thread code',
    render: (row) => <span className="font-bold text-gray-900">{row.threadCode}</span>,
  },
  { key: 'threadType', label: 'Thread type', render: (row) => row.threadType || '—' },
];

/**
 * Thread catalog list with search, Excel import, and Excel export.
 */
function ThreadCatalogPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('thread');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useCatalogListState<ThreadCatalog>({
    fetchFn: listThreadCatalogs,
    errorMessage: 'Failed to fetch thread catalog',
  });

  /**
   * Deletes one thread after confirmation.
   * @param id - Catalog id
   */
  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this thread?')) return;
    try {
      await deleteThreadCatalog(id);
      list.setRows((prev) => prev.filter((row) => row.id !== id));
      list.setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Thread deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete thread');
    }
  };

  /**
   * Deletes every selected thread.
   */
  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected thread(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            await deleteThreadCatalog(id);
            return id;
          } catch (error) {
            console.error('Failed to delete thread', id, error);
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((row) => !successful.includes(row.id)));
      list.clearSelection();
      if (hasError) toast.error('Some threads could not be deleted');
      else toast.success('Selected threads deleted successfully');
    } catch (error) {
      console.error('Failed to delete selected threads', error);
      toast.error('Failed to delete some threads');
    }
  };

  /**
   * Downloads an Excel template with the two catalog fields.
   */
  const handleExportTemplate = () => {
    try {
      const sampleData = [
        { 'Thread code': 'TH-120', 'Thread type': 'Sewing', Status: 'active' },
        { 'Thread code': 'TH-240', 'Thread type': 'Embroidery', Status: 'active' },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Thread Catalog Template');
      XLSX.writeFile(wb, 'thread_catalog_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  /**
   * Exports the full thread catalog.
   */
  const handleExport = async () => {
    try {
      const data = await listThreadCatalogs({ page: 1, limit: 100000 });
      const ws = XLSX.utils.json_to_sheet(data.results.map(toExportRow));
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Thread Catalog');
      XLSX.writeFile(wb, `thread_catalog_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Thread catalog exported successfully');
    } catch (err) {
      console.error('Error exporting thread catalog:', err);
      toast.error('Failed to export thread catalog');
    }
  };

  /**
   * Imports threads from Excel, matching an existing row by id or thread code.
   * @param e - File input change
   */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing threads...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;
          const allData = await listThreadCatalogs({ page: 1, limit: 100000 });
          const allThreads = allData.results;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const threadCode = (row['Thread code'] || '').toString().trim();
              const threadType = (row['Thread type'] || '').toString().trim();
              if (!threadCode || !threadType) throw new Error('Missing required fields');
              const payload = {
                threadCode,
                threadType,
                status: (row.Status?.toString()?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as
                  | 'active'
                  | 'inactive',
              };
              let threadId = row.ID?.toString().trim();
              if (!threadId) {
                const found = allThreads.find(
                  (item) => item.threadCode.trim().toLowerCase() === threadCode.toLowerCase()
                );
                if (found) threadId = found.id;
              }
              if (threadId) await updateThreadCatalog(threadId, payload);
              else await createThreadCatalog(payload);
              successCount++;
            } catch (error) {
              console.error('Failed to import thread row', error);
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} threads`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} threads`);
          list.refresh();
        } catch (error) {
          console.error('Failed to process thread import', error);
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.onerror = () => {
        list.setImportProgress(null);
        toast.error('Failed to read import file', { id: loadingToast });
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Failed to import threads', error);
      list.setImportProgress(null);
      toast.error('Failed to import threads', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<ThreadCatalog>({
    dataColumns,
    segment: 'thread',
    basePath: '/catalog/thread',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Thread Catalog"
        title="Thread Catalog"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Thread Catalog',
          'Maintain thread codes and thread types used on thread suppliers.',
          ['Search and paginate threads', 'Import or export thread code and thread type', 'Add, edit, or delete threads']
        )}
        canImport={canImport}
        fileInputRef={fileInputRef}
        onImportClick={() => fileInputRef.current?.click()}
        onImportChange={handleImport}
        importProgress={list.importProgress}
        onExportTemplate={handleExportTemplate}
        onExport={handleExport}
        canCreate={canCreate}
        addHref="/catalog/thread/add"
        addLabel="Add Thread"
        canDelete={canDelete}
        selectedCount={list.selectedIds.length}
        onBulkDelete={handleDeleteSelected}
        isLoading={list.isLoading}
        error={list.error}
        rows={list.rows}
        columns={columns}
        rowKey={(row) => row.id}
        selectable={
          canDelete
            ? {
                selectedIds: list.selectedIds,
                selectAll: list.selectAll,
                onSelectAll: list.handleSelectAll,
                onSelect: list.handleSelect,
                getRowId: (row) => row.id,
              }
            : undefined
        }
        currentPage={list.currentPage}
        totalPages={list.totalPages}
        totalResults={list.totalResults}
        onPageChange={list.setCurrentPage}
        emptyIcon="ri-scissors-cut-line"
        emptyAddLabel="Add First Thread"
      />
    </>
  );
}

/**
 * List page. Hidden unless Thread Catalog read is granted.
 */
export default function ThreadCatalogPageGuard() {
  return (
    <RequireCrudPermission path="Catalog.Thread Catalog" action="read">
      <ThreadCatalogPage />
    </RequireCrudPermission>
  );
}
