"use client";

import React, { useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import { PROCESS_DEPARTMENTS } from '@/shared/constants/handkerchiefCatalog';
import { userService, type User } from '@/shared/services/userService';
import {
  Worker,
  UserRef,
  createWorker,
  deleteWorker,
  getUserDisplay,
  listWorkers,
  updateWorker,
} from '@/shared/services/phase3CatalogService';

interface ExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Employee Code'?: string;
  'Department'?: string;
  'Supervisor Email'?: string;
  'Skill'?: string;
  'Shift'?: string;
  'Contact Number'?: string;
  'Barcode'?: string;
  'Join Date'?: string;
  'Status'?: string;
}

const excelColWidths = [
  { wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
  { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 10 },
];

const departmentLabel = (value?: string) =>
  PROCESS_DEPARTMENTS.find((d) => d.value === value)?.label || value || '—';

const getSupervisorEmail = (ref?: string | UserRef | null): string => {
  if (!ref) return '';
  if (typeof ref === 'object' && ref.email) return ref.email;
  return '';
};

const formatJoinDate = (date?: string | null): string => {
  if (!date) return '';
  return date.split('T')[0];
};

const toExportRow = (worker: Worker) => ({
  'ID': worker.id,
  'Name': worker.name,
  'Employee Code': worker.employeeCode || '',
  'Department': worker.department || '',
  'Supervisor Email': getSupervisorEmail(worker.supervisor),
  'Skill': worker.skill || '',
  'Shift': worker.shift || '',
  'Contact Number': worker.contactNumber || '',
  'Barcode': worker.barcode || '',
  'Join Date': formatJoinDate(worker.joinDate),
  'Status': worker.status,
});

const dataColumns: UiTableColumn<Worker>[] = [
  { key: 'name', label: 'Name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
  { key: 'employeeCode', label: 'Employee Code', render: (row) => row.employeeCode || '—' },
  { key: 'department', label: 'Department', render: (row) => departmentLabel(row.department) },
  { key: 'supervisor', label: 'Supervisor', render: (row) => getUserDisplay(row.supervisor) },
  { key: 'skill', label: 'Skill', render: (row) => row.skill || '—' },
  { key: 'shift', label: 'Shift', render: (row) => row.shift || '—' },
];

export default function WorkersPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('workers');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useCatalogListState<Worker>({
    fetchFn: listWorkers,
    errorMessage: 'Failed to fetch workers',
  });

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this worker?')) return;
    try {
      await deleteWorker(id);
      list.setRows((prev) => prev.filter((w) => w.id !== id));
      list.setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Worker deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete worker');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected worker(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            await deleteWorker(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((w) => !successful.includes(w.id)));
      list.clearSelection();
      if (hasError) toast.error('Some workers could not be deleted');
      else toast.success('Selected workers deleted successfully');
    } catch {
      toast.error('Failed to delete some workers');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Name': 'Rajesh Kumar',
          'Employee Code': 'WK001',
          'Department': 'cutting',
          'Supervisor Email': 'supervisor@example.com',
          'Skill': 'Cutting Operator',
          'Shift': 'Morning',
          'Contact Number': '9876543210',
          'Barcode': '',
          'Join Date': '2024-01-15',
          'Status': 'active',
        },
        {
          'Name': 'Priya Sharma',
          'Employee Code': 'WK002',
          'Department': 'hemming',
          'Supervisor Email': 'supervisor@example.com',
          'Skill': 'Hemming Operator',
          'Shift': 'Evening',
          'Contact Number': '9123456780',
          'Barcode': '',
          'Join Date': '2024-03-01',
          'Status': 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Worker Template');
      XLSX.writeFile(wb, 'worker_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const data = await listWorkers({ page: 1, limit: 100000 });
      const exportData = data.results.map(toExportRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Workers');
      XLSX.writeFile(wb, `workers_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Workers exported successfully');
    } catch (err) {
      console.error('Error exporting workers:', err);
      toast.error('Failed to export workers');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing workers...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;

          const allData = await listWorkers({ page: 1, limit: 100000 });
          const allWorkers = allData.results;

          const usersRes = await userService.getUsers({ limit: 500 });
          const users: User[] = usersRes.results || usersRes.users || [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const name = (row['Name'] || '').toString().trim();
              const employeeCode = (row['Employee Code'] || '').toString().trim().toUpperCase();
              if (!name || !employeeCode) throw new Error('Missing required fields');

              const supervisorEmail = (row['Supervisor Email'] || '').toString().trim().toLowerCase();
              const supervisorUser = supervisorEmail
                ? users.find((u) => u.email?.toLowerCase() === supervisorEmail)
                : undefined;

              const joinDateRaw = (row['Join Date'] || '').toString().trim();
              const payload = {
                name,
                employeeCode,
                department: (row['Department'] || '').toString().trim(),
                supervisor: supervisorUser?.id || null,
                skill: (row['Skill'] || '').toString().trim(),
                shift: (row['Shift'] || '').toString().trim(),
                contactNumber: (row['Contact Number'] || '').toString().trim(),
                barcode: (row['Barcode'] || '').toString().trim(),
                joinDate: joinDateRaw || null,
                status: (row['Status']?.toString()?.toLowerCase() === 'active' ? 'active' : 'inactive') as
                  | 'active'
                  | 'inactive',
              };

              let workerId = row['ID']?.toString().trim();
              if (!workerId) {
                const found = allWorkers.find(
                  (w) => w.employeeCode.trim().toUpperCase() === employeeCode
                );
                if (found) workerId = found.id;
              }

              if (workerId) await updateWorker(workerId, payload);
              else await createWorker(payload);
              successCount++;
            } catch {
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} workers`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} workers`);
          list.refresh();
        } catch {
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      list.setImportProgress(null);
      toast.error('Failed to import workers', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<Worker>({
    dataColumns,
    segment: 'workers',
    basePath: '/catalog/workers',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Workers / Operators"
        title="Workers / Operators"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Workers / Operators Management',
          'Manage floor workers and operators — employee details, department, supervisor, skills, and shift assignments.',
          [
            'Search, paginate, and export workers',
            'Import via Excel (upsert by ID or employee code)',
            'Add, edit, or delete workers',
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
        addHref="/catalog/workers/add"
        addLabel="Add Worker"
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
        emptyIcon="ri-user-line"
        emptyAddLabel="Add First Worker"
      />
    </>
  );
}
