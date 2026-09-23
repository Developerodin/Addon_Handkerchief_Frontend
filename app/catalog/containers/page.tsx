"use client";

import React, { useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import { CONTAINER_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import {
  Container,
  createContainer,
  deleteContainer,
  listContainers,
  updateContainer,
} from '@/shared/services/phase3CatalogService';

interface ExcelRow {
  ID?: string;
  Code?: string;
  Name?: string;
  Type?: string;
  Capacity?: string | number;
  Barcode?: string;
  Department?: string;
  Floor?: string;
  Reusable?: string;
  Status?: string;
}

const excelColWidths = [
  { wch: 24 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 10 },
  { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
];

const getTypeLabel = (type?: string) =>
  CONTAINER_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type || '—';

const parseReusable = (value?: string): boolean => {
  const normalized = (value || '').toString().trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
};

const toExportRow = (container: Container) => ({
  ID: container.id,
  Code: container.code || '',
  Name: container.name,
  Type: container.type || '',
  Capacity: container.capacity ?? '',
  Barcode: container.barcode || '',
  Department: container.department || '',
  Floor: container.floor || '',
  Reusable: container.reusable ? 'Yes' : 'No',
  Status: container.status,
});

const dataColumns: UiTableColumn<Container>[] = [
  { key: 'code', label: 'Code', render: (row) => <span className="font-bold text-gray-900">{row.code}</span> },
  { key: 'name', label: 'Name', render: (row) => row.name },
  { key: 'type', label: 'Type', render: (row) => getTypeLabel(row.type) },
  { key: 'department', label: 'Department', render: (row) => row.department || '—' },
  { key: 'floor', label: 'Floor', render: (row) => row.floor || '—' },
  { key: 'reusable', label: 'Reusable', render: (row) => (row.reusable ? 'Yes' : 'No') },
];

export default function ContainersPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('containers');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useCatalogListState<Container>({
    fetchFn: listContainers,
    errorMessage: 'Failed to fetch containers',
  });

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this container?')) return;
    try {
      await deleteContainer(id);
      list.setRows((prev) => prev.filter((c) => c.id !== id));
      list.setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Container deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete container');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected container(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            await deleteContainer(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((c) => !successful.includes(c.id)));
      list.clearSelection();
      if (hasError) toast.error('Some containers could not be deleted');
      else toast.success('Selected containers deleted successfully');
    } catch {
      toast.error('Failed to delete some containers');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          Code: 'BND-001',
          Name: 'Bundle Tray A',
          Type: 'bundle',
          Capacity: 60,
          Barcode: 'CT-BND-001',
          Department: 'cutting',
          Floor: '1',
          Reusable: 'Yes',
          Status: 'active',
        },
        {
          Code: 'CRT-001',
          Name: 'Carton Box 120',
          Type: 'carton',
          Capacity: 120,
          Barcode: 'CT-CRT-001',
          Department: 'packing',
          Floor: '2',
          Reusable: 'No',
          Status: 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Container Template');
      XLSX.writeFile(wb, 'container_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const data = await listContainers({ page: 1, limit: 100000 });
      const exportData = data.results.map(toExportRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Containers');
      XLSX.writeFile(wb, `containers_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Containers exported successfully');
    } catch (err) {
      console.error('Error exporting containers:', err);
      toast.error('Failed to export containers');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing containers...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;
          const allData = await listContainers({ page: 1, limit: 100000 });
          const allContainers = allData.results;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const code = (row.Code || '').toString().trim();
              const name = (row.Name || '').toString().trim();
              if (!code || !name) throw new Error('Missing required fields');
              const capacityRaw = row.Capacity;
              const capacity =
                capacityRaw === '' || capacityRaw == null ? undefined : parseInt(capacityRaw.toString(), 10);
              if (capacityRaw != null && capacityRaw !== '' && (isNaN(capacity!) || capacity! < 0)) {
                throw new Error('Invalid capacity');
              }
              const payload = {
                code,
                name,
                type: (row.Type || '').toString().trim() as Container['type'],
                capacity,
                barcode: (row.Barcode || '').toString().trim(),
                department: (row.Department || '').toString().trim(),
                floor: (row.Floor || '').toString().trim(),
                reusable: parseReusable(row.Reusable),
                status: (row.Status?.toString()?.toLowerCase() === 'active' ? 'active' : 'inactive') as
                  | 'active'
                  | 'inactive',
              };
              let containerId = row.ID?.toString().trim();
              if (!containerId) {
                const found = allContainers.find((c) => c.code.trim().toLowerCase() === code.toLowerCase());
                if (found) containerId = found.id;
              }
              if (containerId) await updateContainer(containerId, payload);
              else await createContainer(payload);
              successCount++;
            } catch {
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} containers`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} containers`);
          list.refresh();
        } catch {
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      list.setImportProgress(null);
      toast.error('Failed to import containers', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<Container>({
    dataColumns,
    segment: 'containers',
    basePath: '/catalog/containers',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Containers"
        title="Containers"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Containers Management',
          'Manage production containers — bundles, cartons, trolleys, and crates used to move material across departments and floors.',
          [
            'Search, paginate, and export containers',
            'Import via Excel (upsert by ID or code)',
            'Add, edit, or delete containers',
          ]
        )}
        canImport={canImport}
        fileInputRef={fileInputRef}
        onImportClick={() => fileInputRef.current?.click()}
        onImportChange={handleImport}
        importProgress={list.importProgress}
        onExportTemplate={handleExportTemplate}
        onExport={handleExport}
        canCreate={canCreate}
        addHref="/catalog/containers/add"
        addLabel="Add Container"
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
        emptyIcon="ri-inbox-line"
        emptyAddLabel="Add First Container"
      />
    </>
  );
}
