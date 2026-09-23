"use client";

import React, { useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';

interface FabricSupplier {
  id: string;
  name: string;
}

interface PackagingMaterial {
  id: string;
  name: string;
  type: string;
  sizeSpec?: string;
  unit: string;
  supplier?: string | FabricSupplier | null;
  supplierName?: string;
  rate?: number;
  hsnCode?: string;
  gst?: string;
  minimumStock?: number;
  description?: string;
  status?: 'active' | 'inactive';
  image?: string | null;
}

interface ExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Type'?: string;
  'Size Spec'?: string;
  'Unit'?: string;
  'Supplier Name'?: string;
  'Rate'?: string | number;
  'HSN Code'?: string;
  'GST'?: string;
  'Minimum Stock'?: string | number;
  'Description'?: string;
  'Status'?: string;
  [key: string]: string | number | undefined;
}

const getSupplierDisplay = (material: PackagingMaterial): string => {
  if (material.supplier && typeof material.supplier === 'object' && material.supplier.name) {
    return material.supplier.name;
  }
  return material.supplierName || '—';
};

const dataColumns: UiTableColumn<PackagingMaterial>[] = [
  { key: 'name', label: 'Name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
  { key: 'type', label: 'Type', render: (row) => row.type },
  { key: 'sizeSpec', label: 'Size/Spec', render: (row) => row.sizeSpec || '—' },
  { key: 'unit', label: 'Unit', render: (row) => row.unit },
  { key: 'supplier', label: 'Supplier', render: (row) => getSupplierDisplay(row) },
  { key: 'rate', label: 'Rate', render: (row) => row.rate ?? '—' },
  { key: 'hsnCode', label: 'HSN', render: (row) => row.hsnCode || '—' },
  { key: 'gst', label: 'GST', render: (row) => row.gst || '—' },
  { key: 'minimumStock', label: 'Min Stock', render: (row) => row.minimumStock ?? '—' },
];

export default function PackagingMaterialsPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('raw-material');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const REQUIRED_FIELDS = ['name', 'type', 'unit'];

  const fetchMaterialsFn = useCallback(async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API_BASE_URL}/raw-materials?page=${page}&limit=${limit}${searchParam}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch packaging materials');
    }
    const data = await response.json();
    return {
      results: (Array.isArray(data.results) ? data.results : []) as PackagingMaterial[],
      totalPages: data.totalPages || 1,
      totalResults: data.totalResults || 0,
    };
  }, []);

  const list = useCatalogListState<PackagingMaterial>({
    fetchFn: fetchMaterialsFn,
    errorMessage: 'Failed to fetch packaging materials',
  });

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials?page=1&limit=100000`);
      if (!response.ok) throw new Error('Failed to fetch all packaging materials for export');
      const data = await response.json();
      const exportSource = Array.isArray(data.results) ? data.results : [];
      const exportData = exportSource.map((mat: PackagingMaterial) => ({
        'ID': mat.id,
        'Name': mat.name,
        'Type': mat.type,
        'Size Spec': mat.sizeSpec || '',
        'Unit': mat.unit,
        'Supplier Name': getSupplierDisplay(mat) === '—' ? '' : getSupplierDisplay(mat),
        'Rate': mat.rate ?? '',
        'HSN Code': mat.hsnCode || '',
        'GST': mat.gst || '',
        'Minimum Stock': mat.minimumStock ?? '',
        'Description': mat.description || '',
        'Status': mat.status || 'active',
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 24 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 10 },
        { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 14 },
        { wch: 30 }, { wch: 10 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Packaging Materials');
      const fileName = `packaging-materials_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Packaging materials exported successfully');
    } catch (error) {
      console.error('Error exporting packaging materials:', error);
      toast.error('Failed to export packaging materials');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Name': 'Polybag Medium',
          'Type': 'polybag',
          'Size Spec': '12x16',
          'Unit': 'Pcs',
          'Supplier Name': 'PackWell',
          'Rate': 2.5,
          'HSN Code': '39232990',
          'GST': '18',
          'Minimum Stock': 500,
          'Description': 'Medium size polybag for packaging',
          'Status': 'active',
        },
        {
          'Name': 'Carton 120',
          'Type': 'carton-120',
          'Size Spec': '120 pcs',
          'Unit': 'Pcs',
          'Supplier Name': '',
          'Rate': 45,
          'HSN Code': '48191000',
          'GST': '12',
          'Minimum Stock': 100,
          'Description': 'Standard 120-piece carton',
          'Status': 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = [
        { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
        { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 10 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Packaging Materials');
      XLSX.writeFile(wb, 'packaging_materials_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete()) return;
    if (list.selectedIds.length === 0) return;

    if (window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected material(s)?`)) {
      try {
        for (const id of list.selectedIds) {
          const response = await fetch(`${API_BASE_URL}/raw-materials/${id}`, {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete material: ${id}`);
          }
        }

        toast.success('Selected materials deleted successfully');
        list.clearSelection();
        list.refresh();
      } catch (err) {
        console.error('Error deleting materials:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete materials');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (window.confirm('Are you sure you want to delete this packaging material?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/raw-materials/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete packaging material');
        }

        toast.success('Packaging material deleted successfully');
        list.refresh();
      } catch (err) {
        console.error('Error deleting material:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete packaging material');
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing packaging materials...');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
          let successCount = 0;
          let errorCount = 0;
          let skippedCount = 0;
          let firstErrorMsg = '';

          const [allResponse, suppliersResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/raw-materials?page=1&limit=100000`),
            fetch(`${API_BASE_URL}/fabric-suppliers?limit=500&status=active`),
          ]);
          const allData = allResponse.ok ? await allResponse.json() : { results: [] };
          const allMaterials: PackagingMaterial[] = allData.results || [];
          const suppliersData = suppliersResponse.ok ? await suppliersResponse.json() : { results: [] };
          const suppliers: FabricSupplier[] = suppliersData.results || [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const supplierName = String(row['Supplier Name'] || '').trim();
            const matchedSupplier = supplierName
              ? suppliers.find(s => s.name.trim().toLowerCase() === supplierName.toLowerCase())
              : undefined;

            const rateRaw = row['Rate'];
            const minStockRaw = row['Minimum Stock'];
            const statusRaw = String(row['Status'] || 'active').trim().toLowerCase();

            const material: Record<string, unknown> = {
              name: String(row['Name'] || '').trim(),
              type: String(row['Type'] || '').trim(),
              sizeSpec: String(row['Size Spec'] || '').trim(),
              unit: String(row['Unit'] || '').trim(),
              supplier: matchedSupplier?.id || null,
              supplierName: supplierName,
              rate: rateRaw === '' || rateRaw == null ? 0 : Number(rateRaw),
              hsnCode: String(row['HSN Code'] || '').trim(),
              gst: String(row['GST'] || '').trim(),
              minimumStock: minStockRaw === '' || minStockRaw == null ? 0 : Number(minStockRaw),
              description: String(row['Description'] || '').trim(),
              status: statusRaw === 'inactive' ? 'inactive' : 'active',
            };

            const missingFields = REQUIRED_FIELDS.filter(f => !material[f]);
            if (missingFields.length > 0) {
              skippedCount++;
              if (!firstErrorMsg) firstErrorMsg = `Row ${i + 2}: Missing required fields: ${missingFields.join(', ')}`;
              continue;
            }

            let materialId = row['ID'] ? String(row['ID']).trim() : '';
            if (!materialId) {
              const found = allMaterials.find(
                m => m.name.trim().toLowerCase() === String(material.name).toLowerCase()
              );
              if (found) materialId = found.id;
            }

            try {
              if (materialId) {
                const patchResponse = await fetch(`${API_BASE_URL}/raw-materials/${materialId}`, {
                  method: 'PATCH',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(material),
                });
                const patchResult = await patchResponse.clone().json().catch(() => ({}));
                if (!patchResponse.ok) {
                  throw new Error(patchResult.message || 'Failed to update');
                }
                successCount++;
              } else {
                const postResponse = await fetch(`${API_BASE_URL}/raw-materials`, {
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(material),
                });
                const postResult = await postResponse.clone().json().catch(() => ({}));
                if (!postResponse.ok) {
                  throw new Error(postResult.message || 'Failed to create');
                }
                successCount++;
              }
            } catch (error: unknown) {
              errorCount++;
              const message = error instanceof Error ? error.message : 'Unknown error';
              if (!firstErrorMsg) firstErrorMsg = `Row ${i + 2}: ${message}`;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} materials`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} materials. ${firstErrorMsg}`);
          if (skippedCount > 0) toast.error(`Skipped ${skippedCount} row(s) due to missing required fields. ${firstErrorMsg}`);
          list.refresh();
        } catch (err: unknown) {
          list.setImportProgress(null);
          const message = err instanceof Error ? err.message : '';
          toast.error('Failed to process import file: ' + message, { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: unknown) {
      list.setImportProgress(null);
      const message = err instanceof Error ? err.message : '';
      toast.error('Failed to import materials: ' + message, { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<PackagingMaterial>({
    dataColumns,
    segment: 'raw-material',
    basePath: '/catalog/raw-material',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Packaging materials"
        title="Packaging materials"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Packaging materials',
          'Catalog packing materials consumed at order packing — polybags, cartons, tags, stickers, threads, and more.',
          [
            'Browse packaging materials with type, size/spec, supplier, and stock levels',
            'Maintain name, type, unit, rate, HSN, GST, and minimum stock',
            'Import or export Excel with packaging columns',
            'Search by name, type, size, supplier, or HSN',
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
        addHref="/catalog/raw-material/add"
        addLabel="Add Material"
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
        emptyIcon="ri-stack-line"
        emptyAddLabel="Add First Material"
      />
    </>
  );
}
