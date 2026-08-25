'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Seo from '@/shared/layout-components/seo/seo';
import HelpIcon from '@/shared/components/HelpIcon';
import CatalogRowActions from '@/shared/components/catalog/CatalogRowActions';
import CatalogPageSizeSelect from '@/shared/components/catalog/CatalogPageSizeSelect';
import { useCatalogCrud, CatalogSegment } from '@/shared/hooks/useCatalogCrud';
import { FabricLookupStatus } from '@/shared/services/fabricLookupService';

type LookupApi<T extends { id: string; name: string; status?: FabricLookupStatus }> = {
  list: (params: { page?: number; limit?: number; search?: string; category?: string }) => Promise<{
    results: T[];
    totalPages: number;
    totalResults: number;
  }>;
  create: (payload: Partial<T>) => Promise<T>;
  update: (id: string, payload: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

export interface FabricLookupColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number;
  importKey?: string;
}

export interface FabricLookupListConfig<T extends { id: string; name: string; status?: FabricLookupStatus }> {
  segment: CatalogSegment;
  title: string;
  description: string;
  basePath: string;
  api: LookupApi<T>;
  columns: FabricLookupColumn<T>[];
  importTemplateRow: Record<string, string | number>;
  importTemplateRows?: Record<string, string | number>[];
  mapImportRow: (row: Record<string, unknown>, existing?: T) => Partial<T>;
  findExisting?: (rows: T[], importRow: Record<string, unknown>) => T | undefined;
}

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

export function FabricLookupListPage<T extends { id: string; name: string; status?: FabricLookupStatus }>({
  config,
}: {
  config: FabricLookupListConfig<T>;
}) {
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

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm(`Delete this ${config.title.toLowerCase()}?`)) return;
    try {
      await config.api.remove(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      toast.success(`${config.title} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleExportTemplate = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(config.importTemplateRows?.length ? config.importTemplateRows : [config.importTemplateRow]);
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
    const exportData = data.results.map((row) => {
      const out: Record<string, string | number> = { ID: row.id, Name: row.name, Status: row.status || 'active' };
      config.columns.forEach((col) => {
        if (col.exportValue) out[col.label] = col.exportValue(row);
      });
      return out;
    });
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
              if (!name) throw new Error('Name required');
              const payload = config.mapImportRow(importRow);
              let existingId = String(importRow.ID || importRow.id || '').trim();
              if (!existingId && config.findExisting) {
                existingId = config.findExisting(allData.results, importRow)?.id || '';
              }
              if (!existingId) {
                const found = allData.results.find((row) => row.name.trim().toLowerCase() === name.toLowerCase());
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

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title={config.title} />
      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">{config.title}</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title={config.title}
                content={
                  <div>
                    <p className="text-gray-700">{config.description}</p>
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
              {canCreate && (
                <Link
                  href={`${config.basePath}/add`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add {config.title}
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
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-stack-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              {canCreate && (
                <Link
                  href={`${config.basePath}/add`}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add First {config.title}
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  {config.columns.map((col) => (
                    <th key={col.key} className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  {(canUpdate || canDelete) && (
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{row.name}</td>
                    {config.columns.map((col) => (
                      <td key={col.key} className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                        {col.render ? col.render(row) : '—'}
                      </td>
                    ))}
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
                          row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {row.status || 'active'}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <CatalogRowActions
                          segment={config.segment}
                          editHref={`${config.basePath}/edit/${row.id}`}
                          onDelete={() => handleDelete(row.id)}
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
                type="button"
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
                      type="button"
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
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
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
}
