"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import HelpIcon from '@/shared/components/HelpIcon';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import CatalogRowActions from '@/shared/components/catalog/CatalogRowActions';
import CatalogPageSizeSelect from '@/shared/components/catalog/CatalogPageSizeSelect';
import { CONTAINER_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import {
  Container,
  createContainer,
  deleteContainer,
  listContainers,
  updateContainer,
} from '@/shared/services/phase3CatalogService';

interface ExcelRow {
  'ID'?: string;
  'Code'?: string;
  'Name'?: string;
  'Type'?: string;
  'Capacity'?: string | number;
  'Barcode'?: string;
  'Department'?: string;
  'Floor'?: string;
  'Reusable'?: string;
  'Status'?: string;
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
  'ID': container.id,
  'Code': container.code || '',
  'Name': container.name,
  'Type': container.type || '',
  'Capacity': container.capacity ?? '',
  'Barcode': container.barcode || '',
  'Department': container.department || '',
  'Floor': container.floor || '',
  'Reusable': container.reusable ? 'Yes' : 'No',
  'Status': container.status,
});

const ContainersPage = () => {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('containers');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchContainers = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listContainers({ page, limit, search });
      setContainers(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch containers');
      setContainers([]);
      setTotalPages(1);
      toast.error('Failed to load containers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(containers.map((c) => c.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this container?')) return;
    try {
      await deleteContainer(id);
      setContainers((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Container deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete container');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete()) return;
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected container(s)?`)) return;

    try {
      let hasError = false;
      const results = await Promise.all(
        selectedIds.map(async (id) => {
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
      setContainers((prev) => prev.filter((c) => !successful.includes(c.id)));
      setSelectedIds([]);
      setSelectAll(false);
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
          'Code': 'BND-001',
          'Name': 'Bundle Tray A',
          'Type': 'bundle',
          'Capacity': 60,
          'Barcode': 'CT-BND-001',
          'Department': 'cutting',
          'Floor': '1',
          'Reusable': 'Yes',
          'Status': 'active',
        },
        {
          'Code': 'CRT-001',
          'Name': 'Carton Box 120',
          'Type': 'carton',
          'Capacity': 120,
          'Barcode': 'CT-CRT-001',
          'Department': 'packing',
          'Floor': '2',
          'Reusable': 'No',
          'Status': 'active',
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
    setImportProgress(0);
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
              const code = (row['Code'] || '').toString().trim();
              const name = (row['Name'] || '').toString().trim();
              if (!code || !name) throw new Error('Missing required fields');

              const capacityRaw = row['Capacity'];
              const capacity =
                capacityRaw === '' || capacityRaw == null
                  ? undefined
                  : parseInt(capacityRaw.toString(), 10);
              if (capacityRaw != null && capacityRaw !== '' && (isNaN(capacity!) || capacity! < 0)) {
                throw new Error('Invalid capacity');
              }

              const payload = {
                code,
                name,
                type: (row['Type'] || '').toString().trim() as Container['type'],
                capacity,
                barcode: (row['Barcode'] || '').toString().trim(),
                department: (row['Department'] || '').toString().trim(),
                floor: (row['Floor'] || '').toString().trim(),
                reusable: parseReusable(row['Reusable']),
                status: (row['Status']?.toString()?.toLowerCase() === 'active' ? 'active' : 'inactive') as
                  | 'active'
                  | 'inactive',
              };

              let containerId = row['ID']?.toString().trim();
              if (!containerId) {
                const found = allContainers.find(
                  (c) => c.code.trim().toLowerCase() === code.toLowerCase()
                );
                if (found) containerId = found.id;
              }

              if (containerId) {
                await updateContainer(containerId, payload);
              } else {
                await createContainer(payload);
              }
              successCount++;
            } catch {
              errorCount++;
            }
            setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} containers`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} containers`);
          fetchContainers(currentPage, itemsPerPage, searchQuery);
        } catch {
          setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      setImportProgress(null);
      toast.error('Failed to import containers', { id: loadingToast });
    }
  };

  function getPagination(page: number, pages: number) {
    const items: (number | string)[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) items.push(i);
    } else {
      items.push(1);
      if (page > 4) items.push('...');
      for (let i = Math.max(2, page - 2); i <= Math.min(pages - 1, page + 2); i++) items.push(i);
      if (page < pages - 3) items.push('...');
      items.push(pages);
    }
    return items;
  }

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Containers" />

      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Containers</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Containers Management"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        Manage production containers — bundles, cartons, trolleys, and crates used to move material across departments and floors.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Search, paginate, and export containers</li>
                        <li>Import via Excel (upsert by ID or code)</li>
                        <li>Add, edit, or delete containers</li>
                      </ul>
                    </div>
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
              {canDelete && selectedIds.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm"
                  onClick={handleDeleteSelected}
                >
                  <i className="ri-delete-bin-line text-xs"></i> Delete ({selectedIds.length})
                </button>
              )}
              {canCreate && (
                <Link
                  href="/catalog/containers/add"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add Container
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
          ) : containers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              {canCreate && (
                <Link
                  href="/catalog/containers/add"
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add First Container
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                    />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Code</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Department</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Floor</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Reusable</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  {(canUpdate || canDelete) && (
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {containers.map((container) => (
                  <tr key={container.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(container.id)}
                        onChange={() => handleSelect(container.id)}
                        className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                      />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{container.code}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{container.name}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{getTypeLabel(container.type)}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{container.department || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{container.floor || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{container.reusable ? 'Yes' : 'No'}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
                          container.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {container.status}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <CatalogRowActions
                          segment="containers"
                          editHref={`/catalog/containers/edit/${container.id}`}
                          onDelete={() => handleDelete(container.id)}
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
              Showing{' '}
              <span>
                {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                {totalResults === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalResults)}
              </span>{' '}
              of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <div className="flex items-center gap-1 mx-2">
                {getPagination(currentPage, totalPages).map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${
                        currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContainersPage;
