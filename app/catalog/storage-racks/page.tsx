"use client";

import React, { useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import { STOCK_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import {
  StorageRack,
  createStorageRack,
  deleteStorageRack,
  listStorageRacks,
  updateStorageRack,
} from '@/shared/services/phase3CatalogService';

interface ExcelRow {
  'ID'?: string;
  'Code'?: string;
  'Name'?: string;
  'Floor'?: string;
  'Zone'?: string;
  'Stock Type'?: string;
  'Capacity'?: string | number;
  'Barcode'?: string;
  'Status'?: string;
}

const excelColWidths = [
  { wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 12 },
  { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 10 },
];

const stockTypeLabel = (value?: string) =>
  STOCK_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || '—';

const parseStockType = (raw: string): StorageRack['stockType'] | undefined => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return undefined;
  const byValue = STOCK_TYPE_OPTIONS.find((o) => o.value.toLowerCase() === trimmed);
  if (byValue) return byValue.value as StorageRack['stockType'];
  const byLabel = STOCK_TYPE_OPTIONS.find((o) => o.label.toLowerCase() === trimmed);
  if (byLabel) return byLabel.value as StorageRack['stockType'];
  return undefined;
};

const toExportRow = (rack: StorageRack) => ({
  'ID': rack.id,
  'Code': rack.code || '',
  'Name': rack.name,
  'Floor': rack.floor || '',
  'Zone': rack.zone || '',
  'Stock Type': stockTypeLabel(rack.stockType),
  'Capacity': rack.capacity ?? '',
  'Barcode': rack.barcode || '',
  'Status': rack.status,
});

const dataColumns: UiTableColumn<StorageRack>[] = [
  { key: 'code', label: 'Code', render: (row) => <span className="font-bold text-gray-900">{row.code}</span> },
  { key: 'name', label: 'Name', render: (row) => row.name },
  { key: 'floor', label: 'Floor', render: (row) => row.floor || '—' },
  { key: 'zone', label: 'Zone', render: (row) => row.zone || '—' },
  { key: 'stockType', label: 'Stock Type', render: (row) => stockTypeLabel(row.stockType) },
  { key: 'capacity', label: 'Capacity', render: (row) => row.capacity ?? '—' },
];

export default function StorageRacksPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('storage-racks');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useCatalogListState<StorageRack>({
    fetchFn: listStorageRacks,
    errorMessage: 'Failed to fetch storage racks',
  });

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this storage rack?')) return;
    try {
      await deleteStorageRack(id);
      list.setRows((prev) => prev.filter((r) => r.id !== id));
      list.setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Storage rack deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete storage rack');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected rack(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            await deleteStorageRack(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((r) => !successful.includes(r.id)));
      list.clearSelection();
      if (hasError) toast.error('Some storage racks could not be deleted');
      else toast.success('Selected storage racks deleted successfully');
    } catch {
      toast.error('Failed to delete some storage racks');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Code': 'R-A1-01',
          'Name': 'Fabric Rack A1-01',
          'Floor': 'Ground',
          'Zone': 'A',
          'Stock Type': 'Fabric',
          'Capacity': 50,
          'Barcode': 'RACK-A1-01',
          'Status': 'active',
        },
        {
          'Code': 'R-B2-03',
          'Name': 'WIP Rack B2-03',
          'Floor': '1',
          'Zone': 'B',
          'Stock Type': 'WIP Bundle',
          'Capacity': 30,
          'Barcode': 'RACK-B2-03',
          'Status': 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Storage Rack Template');
      XLSX.writeFile(wb, 'storage_rack_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const data = await listStorageRacks({ page: 1, limit: 100000 });
      const exportData = data.results.map(toExportRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Storage Racks');
      XLSX.writeFile(wb, `storage_racks_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Storage racks exported successfully');
    } catch (err) {
      console.error('Error exporting storage racks:', err);
      toast.error('Failed to export storage racks');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing storage racks...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;

          const allData = await listStorageRacks({ page: 1, limit: 100000 });
          const allRacks = allData.results;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const code = (row['Code'] || '').toString().trim();
              const name = (row['Name'] || '').toString().trim();
              if (!code || !name) throw new Error('Missing required fields');

              const capacityRaw = row['Capacity'];
              const capacity =
                capacityRaw === undefined || capacityRaw === ''
                  ? undefined
                  : parseInt(capacityRaw.toString(), 10);

              const payload = {
                code,
                name,
                floor: (row['Floor'] || '').toString().trim(),
                zone: (row['Zone'] || '').toString().trim(),
                stockType: parseStockType((row['Stock Type'] || '').toString()),
                capacity: capacity !== undefined && !isNaN(capacity) ? capacity : undefined,
                barcode: (row['Barcode'] || '').toString().trim(),
                status: (row['Status']?.toString()?.toLowerCase() === 'active' ? 'active' : 'inactive') as
                  | 'active'
                  | 'inactive',
              };

              let rackId = row['ID']?.toString().trim();
              if (!rackId) {
                const found = allRacks.find(
                  (r) => r.code.trim().toLowerCase() === code.toLowerCase()
                );
                if (found) rackId = found.id;
              }

              if (rackId) await updateStorageRack(rackId, payload);
              else await createStorageRack(payload);
              successCount++;
            } catch {
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} storage racks`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} storage racks`);
          list.refresh();
        } catch {
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      list.setImportProgress(null);
      toast.error('Failed to import storage racks', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<StorageRack>({
    dataColumns,
    segment: 'storage-racks',
    basePath: '/catalog/storage-racks',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Storage Racks"
        title="Storage Racks"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Storage Racks Management',
          'Manage warehouse storage racks — location, stock type, capacity, and barcode identifiers.',
          [
            'Search, paginate, and export racks',
            'Import via Excel (upsert by ID or code)',
            'Add, edit, or delete storage racks',
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
        addHref="/catalog/storage-racks/add"
        addLabel="Add Rack"
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
        emptyIcon="ri-archive-line"
        emptyAddLabel="Add First Rack"
      />
    </>
  );
}
