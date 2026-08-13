"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import HelpIcon from '@/shared/components/HelpIcon';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import CatalogRowActions from '@/shared/components/catalog/CatalogRowActions';
import CatalogPageSizeSelect from '@/shared/components/catalog/CatalogPageSizeSelect';

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

const PackagingMaterialsPage = () => {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('raw-material');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [materials, setMaterials] = useState<PackagingMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REQUIRED_FIELDS = ['name', 'type', 'unit'];

  const fetchMaterials = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/raw-materials?page=${page}&limit=${limit}${searchParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch packaging materials');
      }
      const data = await response.json();
      const materialsArray = Array.isArray(data.results) ? data.results : [];
      setMaterials(materialsArray);
      setTotalResults(data.totalResults || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch packaging materials');
      setMaterials([]);
      setTotalPages(1);
      toast.error('Failed to load packaging materials');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(materials.map(mat => mat.id));
    }
    setSelectAll(!selectAll);
  };

  const handleMaterialSelect = (materialId: string) => {
    if (selectedMaterials.includes(materialId)) {
      setSelectedMaterials(selectedMaterials.filter(id => id !== materialId));
    } else {
      setSelectedMaterials([...selectedMaterials, materialId]);
    }
  };

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
    if (selectedMaterials.length === 0) return;

    if (window.confirm(`Are you sure you want to delete ${selectedMaterials.length} selected material(s)?`)) {
      try {
        for (const id of selectedMaterials) {
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
        setSelectedMaterials([]);
        fetchMaterials(currentPage, itemsPerPage, searchQuery);
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
        fetchMaterials(currentPage, itemsPerPage, searchQuery);
      } catch (err) {
        console.error('Error deleting material:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete packaging material');
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
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
            setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} materials`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} materials. ${firstErrorMsg}`);
          if (skippedCount > 0) toast.error(`Skipped ${skippedCount} row(s) due to missing required fields. ${firstErrorMsg}`);
          fetchMaterials(currentPage, itemsPerPage, searchQuery);
        } catch (err: unknown) {
          setImportProgress(null);
          const message = err instanceof Error ? err.message : '';
          toast.error('Failed to process import file: ' + message, { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: unknown) {
      setImportProgress(null);
      const message = err instanceof Error ? err.message : '';
      toast.error('Failed to import materials: ' + message, { id: loadingToast });
    }
  };

  function getPagination(currentPage: number, totalPages: number) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Packaging materials"/>

      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Packaging materials</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Packaging materials"
                content={
                  <div>
                    <p className="mb-4">
                      Catalog packing materials consumed at order packing — polybags, cartons, tags, stickers, threads, and more.
                    </p>
                    <h4 className="font-semibold mb-2">What you can do:</h4>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li><strong>View:</strong> Browse packaging materials with type, size/spec, supplier, and stock levels</li>
                      <li><strong>Add / Edit:</strong> Maintain name, type, unit, rate, HSN, GST, and minimum stock</li>
                      <li><strong>Import / Export:</strong> Bulk load or download Excel with the packaging columns</li>
                      <li><strong>Search:</strong> Find materials by name, type, size, supplier, or HSN</li>
                    </ul>
                    <h4 className="font-semibold mb-2">Fields:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Name, Type, Unit:</strong> Required</li>
                      <li><strong>Size/Spec:</strong> Dimensions or pack count</li>
                      <li><strong>Supplier:</strong> Optional linked supplier or free-text name</li>
                      <li><strong>Rate, HSN, GST, Min Stock:</strong> Costing and reorder tracking</li>
                    </ul>
                  </div>
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>
              <CatalogPageSizeSelect
                value={itemsPerPage}
                onChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
              {canImport && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <i className="ri-upload-2-line text-xs"></i> Import
              </button>
              )}
              {importProgress !== null && (
                <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                  <div className="bg-primary h-full transition-all duration-200" style={{ width: `${importProgress}%` }}></div>
                  <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{importProgress}%</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleExportTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-file-download-line text-xs"></i> Template
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-download-2-line text-xs"></i> Export
              </button>
              {canDelete && selectedMaterials.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm"
                  onClick={handleDeleteSelected}
                >
                  <i className="ri-delete-bin-line text-xs"></i> Delete ({selectedMaterials.length})
                </button>
              )}
              {canCreate && (
              <Link
                href="/catalog/raw-material/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs"></i> Add Material
              </Link>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-error-warning-line text-xl text-red-400"></i>
              </div>
              <p className="text-[12px] font-medium text-red-600">{error}</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-stack-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              {canCreate && (
              <Link href="/catalog/raw-material/add" className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add First Material
              </Link>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Size/Spec</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Unit</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Supplier</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Rate</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">HSN</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">GST</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Min Stock</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  {(canUpdate || canDelete) && (
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input type="checkbox" checked={selectedMaterials.includes(material.id)} onChange={() => handleMaterialSelect(material.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{material.name}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.type}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.sizeSpec || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.unit}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{getSupplierDisplay(material)}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.rate ?? '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.hsnCode || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.gst || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.minimumStock ?? '—'}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${(material.status || 'active') === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {material.status || 'active'}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <CatalogRowActions
                        segment="raw-material"
                        editHref={`/catalog/raw-material/edit/${material.id}`}
                        onDelete={() => handleDelete(material.id)}
                      />
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && !error && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing <span>{totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {totalResults === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalResults)}</span> of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
              <div className="flex items-center gap-1 mx-2">
                {getPagination(currentPage, totalPages).map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span>
                  ) : (
                    <button key={page} onClick={() => setCurrentPage(Number(page))} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
                      {page}
                    </button>
                  )
                )}
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackagingMaterialsPage;
