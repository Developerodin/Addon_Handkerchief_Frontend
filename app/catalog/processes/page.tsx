"use client"

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import HelpIcon from '@/shared/components/HelpIcon';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import CatalogRowActions from '@/shared/components/catalog/CatalogRowActions';
import CatalogPageSizeSelect from '@/shared/components/catalog/CatalogPageSizeSelect';

interface ProcessStep {
  stepTitle: string;
  stepDescription: string;
  duration: number;
}

interface Process {
  id: string;
  name: string;
  code?: string;
  type: string;
  description: string;
  department?: string;
  floor?: string;
  standardTime?: number;
  machineType?: string;
  standardRate?: number;
  qcCheckpoint?: boolean;
  reworkEligible?: boolean;
  sortOrder: number;
  status: 'active' | 'inactive';
  image?: string;
  steps: ProcessStep[];
}

const yesNo = (value?: boolean) => (value ? 'Yes' : 'No');
const parseYesNo = (value: unknown) => {
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1';
};

const ProcessesPage = () => {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('processes');
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  const fetchProcesses = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/processes?page=${page}&limit=${limit}${searchParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch processes');
      }
      const data = await response.json();
      setProcesses(data.results || []);
      setTotalResults(data.totalResults || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch processes');
      setProcesses([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProcesses([]);
    } else {
      setSelectedProcesses(processes.map(proc => proc.id));
    }
    setSelectAll(!selectAll);
  };

  const handleProcessSelect = (processId: string) => {
    if (selectedProcesses.includes(processId)) {
      setSelectedProcesses(selectedProcesses.filter(id => id !== processId));
    } else {
      setSelectedProcesses([...selectedProcesses, processId]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (window.confirm('Are you sure you want to delete this process?')) {
      setIsDeleting(true);
      const loadingToast = toast.loading('Deleting process...');
      try {
        const response = await fetch(`${API_BASE_URL}/processes/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete process');
        }

        await fetchProcesses();
        setSelectedProcesses(prev => prev.filter(selectedId => selectedId !== id));
        toast.success('Process deleted successfully', { id: loadingToast });
      } catch (err) {
        console.error('Error deleting process:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete process', { id: loadingToast });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete()) return;
    if (selectedProcesses.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedProcesses.length} selected process(es)?`)) {
      setIsBulkDeleting(true);
      const loadingToast = toast.loading(`Deleting ${selectedProcesses.length} processes...`);
      try {
        let hasError = false;
        const deletePromises = selectedProcesses.map(async (id) => {
          try {
            const response = await fetch(`${API_BASE_URL}/processes/${id}`, {
              method: 'DELETE',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to delete process: ${id}`);
            }
            return id;
          } catch (err) {
            hasError = true;
            console.error(`Error deleting process ${id}:`, err);
            return null;
          }
        });
        const results = await Promise.all(deletePromises);
        const successfulDeletes = results.filter((id): id is string => id !== null);
        await fetchProcesses();
        setSelectedProcesses([]);
        setSelectAll(false);
        if (hasError) {
          toast.error('Some processes could not be deleted', { id: loadingToast });
        } else {
          toast.success(`Successfully deleted ${successfulDeletes.length} processes`, { id: loadingToast });
        }
      } catch (err) {
        console.error('Error in bulk delete:', err);
        toast.error('Failed to delete processes', { id: loadingToast });
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  const mapProcessToExcelRow = (process: Process) => ({
    'ID': process.id,
    'Process Name': process.name,
    'Code': process.code || '',
    'Description': process.description || '',
    'Type': process.type,
    'Department': process.department || '',
    'Floor': process.floor || '',
    'Standard Time': process.standardTime ?? 0,
    'Machine Type': process.machineType || '',
    'Standard Rate': process.standardRate ?? 0,
    'QC Checkpoint': yesNo(process.qcCheckpoint),
    'Rework Eligible': yesNo(process.reworkEligible),
    'Sort Order': process.sortOrder,
    'Status': process.status,
    'Steps (Title | Description | Duration)': (process.steps || [])
      .map(step => `${step.stepTitle}|${step.stepDescription}|${step.duration}`)
      .join(', ')
  });

  const handleExport = async () => {
    try {
      let exportSource: Process[] = [];
      if (selectedProcesses.length > 0) {
        exportSource = processes.filter(proc => selectedProcesses.includes(proc.id));
      } else {
        const response = await fetch(`${API_BASE_URL}/processes?page=1&limit=100000`);
        if (!response.ok) throw new Error('Failed to fetch all processes for export');
        const data = await response.json();
        exportSource = data.results || [];
      }
      const exportData = exportSource.map(mapProcessToExcelRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 10 }, { wch: 10 }, { wch: 50 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Processes');
      const fileName = `processes_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Processes exported successfully');
    } catch (error) {
      console.error('Error exporting processes:', error);
      toast.error('Failed to export processes');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Process Name': 'Cutting',
          'Code': 'CUT',
          'Description': 'Fabric cutting for handkerchief panels',
          'Type': 'Manufacturing',
          'Department': 'cutting',
          'Floor': '1',
          'Standard Time': 8,
          'Machine Type': 'cutting',
          'Standard Rate': 0,
          'QC Checkpoint': 'No',
          'Rework Eligible': 'Yes',
          'Sort Order': 1,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Lay fabric|Spread and align fabric|3, Cut panels|Cut handkerchief panels|5',
        },
        {
          'Process Name': 'Selvage',
          'Code': 'SEL',
          'Description': 'Selvage edge preparation',
          'Type': 'Manufacturing',
          'Department': 'hemming',
          'Floor': '1',
          'Standard Time': 5,
          'Machine Type': 'none',
          'Standard Rate': 0,
          'QC Checkpoint': 'No',
          'Rework Eligible': 'Yes',
          'Sort Order': 2,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Trim selvage|Prepare selvage edge|5',
        },
        {
          'Process Name': 'Half-moon',
          'Code': 'HM',
          'Description': 'Half-moon cutting operation',
          'Type': 'Manufacturing',
          'Department': 'cutting',
          'Floor': '1',
          'Standard Time': 6,
          'Machine Type': 'half-moon',
          'Standard Rate': 0,
          'QC Checkpoint': 'No',
          'Rework Eligible': 'Yes',
          'Sort Order': 3,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Half-moon cut|Cut half-moon shape|6',
        },
        {
          'Process Name': 'Hemming',
          'Code': 'HEM',
          'Description': 'Edge hemming of handkerchief',
          'Type': 'Manufacturing',
          'Department': 'hemming',
          'Floor': '1',
          'Standard Time': 12,
          'Machine Type': 'vertical-hemming',
          'Standard Rate': 0,
          'QC Checkpoint': 'No',
          'Rework Eligible': 'Yes',
          'Sort Order': 4,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Hem edges|Stitch hem on all sides|12',
        },
        {
          'Process Name': 'Checking',
          'Code': 'CHK',
          'Description': 'Quality checking of finished piece',
          'Type': 'Quality Control',
          'Department': 'checking',
          'Floor': '2',
          'Standard Time': 4,
          'Machine Type': 'none',
          'Standard Rate': 0,
          'QC Checkpoint': 'Yes',
          'Rework Eligible': 'Yes',
          'Sort Order': 5,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Inspect|Visual and measurement check|4',
        },
        {
          'Process Name': 'Ironing',
          'Code': 'IRN',
          'Description': 'Press and finish handkerchief',
          'Type': 'Manufacturing',
          'Department': 'ironing',
          'Floor': '2',
          'Standard Time': 5,
          'Machine Type': 'ironing',
          'Standard Rate': 0,
          'QC Checkpoint': 'No',
          'Rework Eligible': 'Yes',
          'Sort Order': 6,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Press|Iron and fold finish|5',
        },
        {
          'Process Name': 'Packing',
          'Code': 'PKG',
          'Description': 'Pack finished handkerchiefs',
          'Type': 'Packaging',
          'Department': 'packing',
          'Floor': '2',
          'Standard Time': 3,
          'Machine Type': 'none',
          'Standard Rate': 0,
          'QC Checkpoint': 'No',
          'Rework Eligible': 'No',
          'Sort Order': 7,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Pack|Pack into poly bags/cartons|3',
        },
        {
          'Process Name': 'Embroidery',
          'Code': 'EMB',
          'Description': 'Embroidery stitching on handkerchief',
          'Type': 'Manufacturing',
          'Department': 'embroidery',
          'Floor': '1',
          'Standard Time': 20,
          'Machine Type': 'embroidery',
          'Standard Rate': 0,
          'QC Checkpoint': 'Yes',
          'Rework Eligible': 'Yes',
          'Sort Order': 8,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Embroider|Run embroidery design|20',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = [
        { wch: 16 }, { wch: 10 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
        { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        { wch: 10 }, { wch: 50 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Process Template');
      XLSX.writeFile(wb, 'process_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading('Importing processes...');
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          let successCount = 0;
          let errorCount = 0;
          const allResponse = await fetch(`${API_BASE_URL}/processes?page=1&limit=100000`);
          const allData = allResponse.ok ? await allResponse.json() : { results: [] };
          const allProcesses: Process[] = allData.results || [];
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i] as Record<string, unknown>;
            try {
              const stepsString = String(row['Steps (Title | Description | Duration)'] || '');
              const steps = stepsString.split(',').map((stepStr: string) => {
                const [stepTitle = '', stepDescription = '', duration = '0'] = stepStr.trim().split('|');
                return {
                  stepTitle: stepTitle.trim(),
                  stepDescription: stepDescription.trim(),
                  duration: parseInt(duration.trim()) || 0
                };
              }).filter((step) => step.stepTitle);
              const processData = {
                name: String(row['Process Name'] || ''),
                code: String(row['Code'] || ''),
                description: String(row['Description'] || ''),
                type: String(row['Type'] || ''),
                department: String(row['Department'] || '').trim().toLowerCase(),
                floor: String(row['Floor'] || ''),
                standardTime: Number(row['Standard Time']) || 0,
                machineType: String(row['Machine Type'] || '').trim().toLowerCase(),
                standardRate: Number(row['Standard Rate']) || 0,
                qcCheckpoint: parseYesNo(row['QC Checkpoint']),
                reworkEligible: parseYesNo(row['Rework Eligible']),
                sortOrder: parseInt(String(row['Sort Order'] ?? '0')) || 0,
                status: (String(row['Status'] || '').toLowerCase() === 'active') ? 'active' : 'inactive',
                steps: steps.length > 0 ? steps : [{ stepTitle: 'Step 1', stepDescription: 'Default step', duration: 0 }],
              };
              if (!processData.name || !processData.type) {
                errorCount++;
                continue;
              }
              let processId = row['ID'] as string | undefined;
              if (!processId) {
                const found = allProcesses.find(p => p.name.trim().toLowerCase() === processData.name.trim().toLowerCase());
                if (found) processId = found.id;
              }
              if (processId) {
                const patchResponse = await fetch(`${API_BASE_URL}/processes/${processId}`, {
                  method: 'PATCH',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(processData),
                });
                if (!patchResponse.ok) throw new Error();
                successCount++;
              } else {
                const postResponse = await fetch(`${API_BASE_URL}/processes`, {
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(processData),
                });
                if (!postResponse.ok) throw new Error();
                successCount++;
              }
            } catch (error) {
              errorCount++;
            }
            setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} processes`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} processes`);
          fetchProcesses();
        } catch (error) {
          setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      setImportProgress(null);
      toast.error('Failed to import processes', { id: loadingToast });
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
      <Seo title="Process Master"/>

      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Process Master</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Process Master"
                content={
                  <div>
                    <p className="mb-4">Manage handkerchief manufacturing processes used in product production routes.</p>
                    <h4 className="font-semibold mb-2">What you can do:</h4>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li><strong>View Processes:</strong> See all processes with code, department, type, and status</li>
                      <li><strong>Add / Edit:</strong> Maintain process details including time, machine type, QC and rework flags</li>
                      <li><strong>Import/Export:</strong> Bulk load processes from Excel using the handkerchief template</li>
                    </ul>
                    <h4 className="font-semibold mb-2">Key fields:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Code / Department / Floor:</strong> Identify and locate the process</li>
                      <li><strong>Standard Time / Rate:</strong> Minutes and costing rate</li>
                      <li><strong>Machine Type:</strong> cutting, half-moon, hemming, embroidery, ironing, etc.</li>
                      <li><strong>QC Checkpoint / Rework Eligible:</strong> Quality and rework behaviour</li>
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
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm">
                <i className="ri-upload-2-line text-xs"></i> Import
              </button>
              )}
              {importProgress !== null && (
                <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                  <div className="bg-primary h-full transition-all duration-200" style={{ width: `${importProgress}%` }}></div>
                  <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{importProgress}%</span>
                </div>
              )}
              <button type="button" onClick={handleExportTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm">
                <i className="ri-file-download-line text-xs"></i> Template
              </button>
              <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-download-2-line text-xs"></i> Export
              </button>
              {canDelete && selectedProcesses.length > 0 && (
                <button type="button" onClick={handleDeleteSelected} disabled={isBulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm">
                  <i className="ri-delete-bin-line text-xs"></i> Delete ({selectedProcesses.length})
                </button>
              )}
              {canCreate && (
              <Link href="/catalog/processes/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add Process
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
          ) : processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-settings-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              {canCreate && (
              <Link href="/catalog/processes/add" className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add First Process
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
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Process Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Code</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Department</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Steps</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Sort Order</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  {(canUpdate || canDelete) && (
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {processes.map((process) => (
                  <tr key={process.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input type="checkbox" checked={selectedProcesses.includes(process.id)} onChange={() => handleProcessSelect(process.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                      <div className="flex items-center gap-2">
                        {process.image && (
                          <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            <Image src={process.image} alt={process.name} fill className="object-cover" sizes="32px" />
                          </div>
                        )}
                        <span>{process.name}</span>
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{process.code || '—'}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      {process.department ? (
                        <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-gray-100 text-gray-700">{process.department}</span>
                      ) : (
                        <span className="text-[12px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-purple-100 text-purple-800">{process.type}</span>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{process.steps?.length ?? 0} steps</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{process.sortOrder}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${process.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{process.status}</span>
                    </td>
                    {(canUpdate || canDelete) && (
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <CatalogRowActions
                        segment="processes"
                        editHref={`/catalog/processes/edit/${process.id}`}
                        onDelete={() => handleDelete(process.id)}
                        deleteDisabled={isDeleting}
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
                  page === '...' ? <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span> : (
                    <button key={page} onClick={() => setCurrentPage(Number(page))} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{page}</button>
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

export default ProcessesPage;
