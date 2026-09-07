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
import {
  FabricCatalog,
  createFabricCatalog,
  deleteFabricCatalog,
  getLookupName,
  listFabricCatalogs,
  updateFabricCatalog,
} from '@/shared/services/fabricCatalogService';
import {
  fabricTypeApi,
  fabricColorApi,
  fabricQualityApi,
  fabricYarnApi,
  fabricCountApi,
  fabricMeasurementApi,
} from '@/shared/services/fabricLookupService';
import {
  normalizeFabricDesign,
  normalizeFabricFinish,
  normalizeFabricWash,
} from '@/shared/constants/handkerchiefCatalog';

interface ExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Fabric Sort No.'?: string;
  'Mill Old Fabric Sort No.'?: string;
  'Mill New Fabric Sort No.'?: string;
  'Fabric Type'?: string;
  'Color'?: string;
  'Quality'?: string;
  'Yarn'?: string;
  'Count'?: string;
  'Construction'?: string;
  'Weave'?: string;
  'Design'?: string;
  'Wash'?: string;
  'Finish'?: string;
  'GLM'?: string | number;
  'GLM Measurement'?: string;
  'Finished Width'?: string | number;
  'Finished Width Measurement'?: string;
  'Rate'?: string | number;
  'GST'?: string;
  'HSN Code'?: string;
  'Min Quantity in Kg'?: string | number;
  'Status'?: string;
  'Remarks'?: string;
}

const excelColWidths = Array.from({ length: 25 }, () => ({ wch: 16 }));

const toExportRow = (fabric: FabricCatalog) => ({
  'ID': fabric.id,
  'Name': fabric.name,
  'Fabric Sort No.': fabric.fabricSortNo || '',
  'Mill Old Fabric Sort No.': fabric.millOldFabricSortNo || '',
  'Mill New Fabric Sort No.': fabric.millNewFabricSortNo || '',
  'Fabric Type': fabric.fabricTypeName || getLookupName(fabric.fabricType),
  'Color': fabric.colourName || getLookupName(fabric.color),
  'Quality': fabric.qualityName || getLookupName(fabric.quality),
  'Yarn': fabric.yarnName || getLookupName(fabric.yarn),
  'Count': fabric.countName || getLookupName(fabric.count),
  'Construction': fabric.construction || '',
  'Weave': fabric.weave || '',
  'Design': fabric.design || '',
  'Wash': fabric.wash || '',
  'Finish': fabric.finish || '',
  'GLM': fabric.glm ?? '',
  'GLM Measurement': fabric.glmMeasurementName || getLookupName(fabric.glmMeasurement),
  'Finished Width': fabric.finishedWidth ?? '',
  'Finished Width Measurement':
    fabric.finishedWidthMeasurementName || getLookupName(fabric.finishedWidthMeasurement),
  'Rate': fabric.rate ?? '',
  'GST': fabric.gst || '',
  'HSN Code': fabric.hsnCode || '',
  'Min Quantity in Kg': fabric.minQuantity ?? '',
  'Status': fabric.status,
  'Remarks': fabric.remark || '',
});

const parseNumber = (value: string | number | undefined, fallback = 0): number => {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const FabricMasterPage = () => {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('fabric');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [fabrics, setFabrics] = useState<FabricCatalog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFabrics = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listFabricCatalogs({ page, limit, search });
      setFabrics(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fabric catalogs');
      setFabrics([]);
      setTotalPages(1);
      toast.error('Failed to load fabric master');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFabrics(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(fabrics.map((f) => f.id));
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
    if (!window.confirm('Are you sure you want to delete this fabric?')) return;
    try {
      await deleteFabricCatalog(id);
      setFabrics((prev) => prev.filter((f) => f.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Fabric deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete fabric');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete()) return;
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected fabric(s)?`)) return;

    try {
      let hasError = false;
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            await deleteFabricCatalog(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      setFabrics((prev) => prev.filter((f) => !successful.includes(f.id)));
      setSelectedIds([]);
      setSelectAll(false);
      if (hasError) toast.error('Some fabrics could not be deleted');
      else toast.success('Selected fabrics deleted successfully');
    } catch {
      toast.error('Failed to delete some fabrics');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Name': 'White Cotton Voile',
          'Fabric Sort No.': 'FC-VOILE-01',
          'Mill Old Fabric Sort No.': '17223',
          'Mill New Fabric Sort No.': 'AW0017223AB0586',
          'Fabric Type': 'Voile',
          'Color': 'White',
          'Quality': 'Premium',
          'Yarn': "60's",
          'Count': '60COMPX60COMP',
          'Construction': '92x80',
          'Weave': 'Plain',
          'Design': 'Plain',
          'Wash': 'Yes',
          'Finish': 'NA',
          'GLM': 60,
          'GLM Measurement': 'GSM',
          'Finished Width': 44,
          'Finished Width Measurement': 'Inch',
          'Rate': 85,
          'GST': '5',
          'HSN Code': '52082100',
          'Min Quantity in Kg': 50,
          'Status': 'active',
          'Remarks': 'Handkerchief base fabric',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fabric Master Template');
      XLSX.writeFile(wb, 'fabric_master_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const data = await listFabricCatalogs({ page: 1, limit: 100000 });
      const exportData = data.results.map(toExportRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fabric Master');
      XLSX.writeFile(wb, `fabric_master_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Fabric master exported successfully');
    } catch (err) {
      console.error('Error exporting fabric master:', err);
      toast.error('Failed to export fabric master');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading('Importing fabric master...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;

          const [allData, typesData, colorsData, qualitiesData, yarnsData, countsData, measurementsData] =
            await Promise.all([
            listFabricCatalogs({ page: 1, limit: 100000 }),
            fabricTypeApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricColorApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricQualityApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricYarnApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricCountApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricMeasurementApi.list({ page: 1, limit: 1000, status: 'active' }),
          ]);
          const allFabrics = allData.results;
          const resolveByName = <T extends { id: string; name: string }>(items: T[], label?: string) =>
            label ? items.find((item) => item.name.trim().toLowerCase() === label.trim().toLowerCase())?.id || null : null;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const name = (row['Name'] || '').toString().trim();
              if (!name) throw new Error('Name is required');

              const payload = {
                name,
                fabricSortNo: (row['Fabric Sort No.'] || '').toString().trim(),
                millOldFabricSortNo: (row['Mill Old Fabric Sort No.'] || '').toString().trim(),
                millNewFabricSortNo: (row['Mill New Fabric Sort No.'] || '').toString().trim(),
                fabricType: resolveByName(typesData.results, (row['Fabric Type'] || '').toString()),
                color: resolveByName(colorsData.results, (row['Color'] || '').toString()),
                quality: resolveByName(qualitiesData.results, (row['Quality'] || '').toString()),
                yarn: resolveByName(yarnsData.results, (row['Yarn'] || '').toString()),
                count: resolveByName(countsData.results, (row['Count'] || '').toString()),
                construction: (row['Construction'] || '').toString().trim(),
                weave: (row['Weave'] || '').toString().trim(),
                design: normalizeFabricDesign((row['Design'] || '').toString()),
                wash: normalizeFabricWash((row['Wash'] || '').toString()),
                finish: normalizeFabricFinish((row['Finish'] || '').toString()),
                glm: parseNumber(row['GLM']),
                glmMeasurement: resolveByName(measurementsData.results, (row['GLM Measurement'] || '').toString()),
                finishedWidth: parseNumber(row['Finished Width']),
                finishedWidthMeasurement: resolveByName(
                  measurementsData.results,
                  (row['Finished Width Measurement'] || '').toString()
                ),
                rate: parseNumber(row['Rate']),
                gst: (row['GST'] || '').toString().trim(),
                hsnCode: (row['HSN Code'] || '').toString().trim(),
                minQuantity: parseNumber(row['Min Quantity in Kg']),
                status: (row['Status']?.toString()?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as
                  | 'active'
                  | 'inactive',
                remark: (row['Remarks'] || row['Remark'] || '').toString().trim(),
              };

              let fabricId = row['ID']?.toString().trim();
              if (!fabricId) {
                const found = allFabrics.find(
                  (f) => f.name.trim().toLowerCase() === name.toLowerCase()
                );
                if (found) fabricId = found.id;
              }

              if (fabricId) {
                await updateFabricCatalog(fabricId, payload);
              } else {
                await createFabricCatalog(payload);
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
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} fabrics`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} fabrics`);
          fetchFabrics(currentPage, itemsPerPage, searchQuery);
        } catch {
          setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      setImportProgress(null);
      toast.error('Failed to import fabric master', { id: loadingToast });
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
      <Seo title="Fabric master" />

      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Fabric master</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Fabric Master Management"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        Manage handkerchief fabric catalog — mill sort numbers, type, color, quality, yarn, count, design, wash, finish, GLM, finished width, rate, HSN/GST, and remarks.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Search, paginate, and export fabrics</li>
                        <li>Import via Excel (upsert by ID or name; resolve lookups by name)</li>
                        <li>Add, edit, or delete fabric records</li>
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
                  href="/catalog/fabric/add"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add Fabric
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
          ) : fabrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-shirt-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              {canCreate && (
                <Link
                  href="/catalog/fabric/add"
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add First Fabric
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
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Sort No</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Mill Old</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Mill New</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Color</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Quality</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Count</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Design</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Wash</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Finish</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">GLM</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Rate</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  {(canUpdate || canDelete) && (
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {fabrics.map((fabric) => (
                  <tr key={fabric.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(fabric.id)}
                        onChange={() => handleSelect(fabric.id)}
                        className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                      />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{fabric.name}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.fabricSortNo || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.millOldFabricSortNo || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.millNewFabricSortNo || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.fabricTypeName || getLookupName(fabric.fabricType) || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.colourName || getLookupName(fabric.color) || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.qualityName || getLookupName(fabric.quality) || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.yarnName || getLookupName(fabric.yarn) || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.countName || getLookupName(fabric.count) || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.design || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.wash || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.finish || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.glm ?? '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{fabric.rate ?? '—'}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
                          fabric.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {fabric.status}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <CatalogRowActions
                          segment="fabric"
                          editHref={`/catalog/fabric/edit/${fabric.id}`}
                          onDelete={() => handleDelete(fabric.id)}
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

export default FabricMasterPage;
