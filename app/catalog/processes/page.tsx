"use client";

import React, { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';

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

const dataColumns: UiTableColumn<Process>[] = [
  {
    key: 'name',
    label: 'Process Name',
    render: (row) => (
      <div className="flex items-center gap-2">
        {row.image && (
          <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
            <Image src={row.image} alt={row.name} fill className="object-cover" sizes="32px" />
          </div>
        )}
        <span className="font-bold text-gray-900">{row.name}</span>
      </div>
    ),
  },
  { key: 'code', label: 'Code', render: (row) => row.code || '—' },
  {
    key: 'department',
    label: 'Department',
    render: (row) =>
      row.department ? (
        <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-gray-100 text-gray-700">
          {row.department}
        </span>
      ) : (
        '—'
      ),
  },
  {
    key: 'type',
    label: 'Type',
    render: (row) => (
      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-purple-100 text-purple-800">
        {row.type}
      </span>
    ),
  },
  { key: 'steps', label: 'Steps', render: (row) => `${row.steps?.length ?? 0} steps` },
  { key: 'sortOrder', label: 'Sort Order', render: (row) => row.sortOrder },
];

export default function ProcessesPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('processes');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fetchProcessesFn = useCallback(async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API_BASE_URL}/processes?page=${page}&limit=${limit}${searchParam}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch processes');
    }
    const data = await response.json();
    return {
      results: (data.results || []) as Process[],
      totalPages: data.totalPages || 1,
      totalResults: data.totalResults || 0,
    };
  }, []);

  const list = useCatalogListState<Process>({
    fetchFn: fetchProcessesFn,
    errorMessage: 'Failed to fetch processes',
  });

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

        await list.refresh();
        list.setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
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
    if (list.selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected process(es)?`)) {
      setIsBulkDeleting(true);
      const loadingToast = toast.loading(`Deleting ${list.selectedIds.length} processes...`);
      try {
        let hasError = false;
        const deletePromises = list.selectedIds.map(async (id) => {
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
        await list.refresh();
        list.clearSelection();
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
      if (list.selectedIds.length > 0) {
        exportSource = list.rows.filter((proc) => list.selectedIds.includes(proc.id));
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
    list.setImportProgress(0);
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
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} processes`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} processes`);
          list.refresh();
        } catch (error) {
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      list.setImportProgress(null);
      toast.error('Failed to import processes', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<Process>({
    dataColumns,
    segment: 'processes',
    basePath: '/catalog/processes',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
    deleteDisabled: () => isDeleting || isBulkDeleting,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Process Master"
        title="Process Master"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Process Master',
          'Manage handkerchief manufacturing processes used in product production routes.',
          [
            'View processes with code, department, type, and status',
            'Add or edit process details including time, machine type, QC and rework flags',
            'Import or export processes via Excel using the handkerchief template',
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
        addHref="/catalog/processes/add"
        addLabel="Add Process"
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
        emptyIcon="ri-settings-line"
        emptyAddLabel="Add First Process"
      />
    </>
  );
}
