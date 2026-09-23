"use client";

import React, { useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import { PROCESS_DEPARTMENTS, MACHINE_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { userService, type User } from '@/shared/services/userService';
import {
  Machine,
  createMachine,
  deleteMachine,
  getUserDisplay,
  listMachines,
  updateMachine,
} from '@/shared/services/phase3CatalogService';

interface ExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Code'?: string;
  'Machine Type'?: string;
  'Make/Model'?: string;
  'Department'?: string;
  'Floor'?: string;
  'Capacity Per Shift'?: string | number;
  'Maintenance Interval Months'?: string | number;
  'Last Maintenance Date'?: string;
  'Next Maintenance Date'?: string;
  'Maintenance Notes'?: string;
  'Supervisor Email'?: string;
  'Status'?: string;
}

const excelColWidths = [
  { wch: 24 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
  { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 22 }, { wch: 18 },
  { wch: 18 }, { wch: 28 }, { wch: 24 }, { wch: 10 },
];

const getSupervisorEmail = (machine: Machine, userEmailById: Map<string, string>): string => {
  const ref = machine.assignedSupervisor;
  if (!ref) return '';
  if (typeof ref === 'object' && ref.email) return ref.email;
  if (typeof ref === 'string') return userEmailById.get(ref) || '';
  return '';
};

const formatDate = (value?: string | null): string => {
  if (!value) return '';
  return value.split('T')[0];
};

const departmentLabel = (value?: string) =>
  PROCESS_DEPARTMENTS.find((d) => d.value === value)?.label || value || '—';

const machineTypeLabel = (value?: string) =>
  MACHINE_TYPE_OPTIONS.find((d) => d.value === value)?.label || value || '—';

const toExportRow = (machine: Machine, userEmailById: Map<string, string>) => ({
  'ID': machine.id,
  'Name': machine.name,
  'Code': machine.code || '',
  'Machine Type': machine.machineType || '',
  'Make/Model': machine.makeModel || '',
  'Department': machine.department || '',
  'Floor': machine.floor || '',
  'Capacity Per Shift': machine.capacityPerShift ?? '',
  'Maintenance Interval Months': machine.maintenanceIntervalMonths ?? '',
  'Last Maintenance Date': formatDate(machine.lastMaintenanceDate),
  'Next Maintenance Date': formatDate(machine.nextMaintenanceDate),
  'Maintenance Notes': machine.maintenanceNotes || '',
  'Supervisor Email': getSupervisorEmail(machine, userEmailById),
  'Status': machine.status || 'active',
});

const dataColumns: UiTableColumn<Machine>[] = [
  { key: 'name', label: 'Name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
  { key: 'code', label: 'Code', render: (row) => row.code || '—' },
  { key: 'machineType', label: 'Type', render: (row) => machineTypeLabel(row.machineType) },
  { key: 'department', label: 'Department', render: (row) => departmentLabel(row.department) },
  { key: 'floor', label: 'Floor', render: (row) => row.floor || '—' },
  { key: 'supervisor', label: 'Supervisor', render: (row) => getUserDisplay(row.assignedSupervisor) },
];

export default function MachinesPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('machines');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useCatalogListState<Machine>({
    fetchFn: listMachines,
    errorMessage: 'Failed to fetch machines',
  });

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this machine?')) return;
    try {
      await deleteMachine(id);
      list.setRows((prev) => prev.filter((m) => m.id !== id));
      list.setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Machine deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete machine');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected machine(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            await deleteMachine(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((m) => !successful.includes(m.id)));
      list.clearSelection();
      if (hasError) toast.error('Some machines could not be deleted');
      else toast.success('Selected machines deleted successfully');
    } catch {
      toast.error('Failed to delete some machines');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Name': 'Cutting Table A1',
          'Code': 'CUT-A1',
          'Machine Type': 'cutting',
          'Make/Model': 'Eastman Eagle 6350',
          'Department': 'cutting',
          'Floor': '1',
          'Capacity Per Shift': 5000,
          'Maintenance Interval Months': 6,
          'Last Maintenance Date': '2025-01-15',
          'Next Maintenance Date': '2025-07-15',
          'Maintenance Notes': 'Blade replacement due Q3',
          'Supervisor Email': 'supervisor@example.com',
          'Status': 'active',
        },
        {
          'Name': 'Vertical Hemming Unit 3',
          'Code': 'VHM-03',
          'Machine Type': 'vertical-hemming',
          'Make/Model': 'Juki MO-6816S',
          'Department': 'hemming',
          'Floor': '2',
          'Capacity Per Shift': 8000,
          'Maintenance Interval Months': 3,
          'Last Maintenance Date': '2025-02-01',
          'Next Maintenance Date': '2025-05-01',
          'Maintenance Notes': '',
          'Supervisor Email': '',
          'Status': 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Machine Template');
      XLSX.writeFile(wb, 'machine_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const buildUserEmailMap = async (): Promise<Map<string, string>> => {
    const map = new Map<string, string>();
    try {
      const res = await userService.getUsers({ limit: 200, sortBy: 'name:asc' });
      const users: User[] = res.results || res.users || [];
      users.forEach((u) => {
        if (u.id && u.email) map.set(u.id, u.email);
      });
    } catch {
      // export still works without email lookup
    }
    return map;
  };

  const handleExport = async () => {
    try {
      const [data, userEmailById] = await Promise.all([
        listMachines({ page: 1, limit: 100000 }),
        buildUserEmailMap(),
      ]);
      const exportData = data.results.map((m) => toExportRow(m, userEmailById));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Machines');
      XLSX.writeFile(wb, `machines_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Machines exported successfully');
    } catch (err) {
      console.error('Error exporting machines:', err);
      toast.error('Failed to export machines');
    }
  };

  const resolveSupervisorByEmail = (email: string, users: User[]): string | undefined => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return undefined;
    const found = users.find((u) => u.email?.toLowerCase() === trimmed);
    return found?.id;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing machines...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;

          const [allData, usersRes] = await Promise.all([
            listMachines({ page: 1, limit: 100000 }),
            userService.getUsers({ limit: 200, sortBy: 'name:asc' }),
          ]);
          const allMachines = allData.results;
          const users: User[] = usersRes.results || usersRes.users || [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const name = (row['Name'] || '').toString().trim();
              if (!name) throw new Error('Missing required field: Name');

              const supervisorEmail = (row['Supervisor Email'] || '').toString().trim();
              const assignedSupervisor = resolveSupervisorByEmail(supervisorEmail, users);

              const capacityRaw = row['Capacity Per Shift'];
              const intervalRaw = row['Maintenance Interval Months'];

              const payload = {
                name,
                code: (row['Code'] || '').toString().trim(),
                machineType: (row['Machine Type'] || '').toString().trim().toLowerCase(),
                makeModel: (row['Make/Model'] || '').toString().trim(),
                department: (row['Department'] || '').toString().trim().toLowerCase(),
                floor: (row['Floor'] || '').toString().trim(),
                capacityPerShift: capacityRaw !== undefined && capacityRaw !== ''
                  ? parseInt(String(capacityRaw), 10) || 0
                  : undefined,
                maintenanceIntervalMonths: intervalRaw !== undefined && intervalRaw !== ''
                  ? parseInt(String(intervalRaw), 10) || 0
                  : undefined,
                lastMaintenanceDate: (row['Last Maintenance Date'] || '').toString().trim() || null,
                nextMaintenanceDate: (row['Next Maintenance Date'] || '').toString().trim() || null,
                maintenanceNotes: (row['Maintenance Notes'] || '').toString().trim(),
                assignedSupervisor: assignedSupervisor || null,
                status: (row['Status']?.toString()?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as
                  | 'active'
                  | 'inactive',
              };

              let machineId = row['ID']?.toString().trim();
              if (!machineId) {
                const found = allMachines.find(
                  (m) => m.name.trim().toLowerCase() === name.toLowerCase()
                );
                if (found) machineId = found.id;
              }

              if (machineId) await updateMachine(machineId, payload);
              else await createMachine(payload);
              successCount++;
            } catch {
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} machines`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} machines`);
          list.refresh();
        } catch {
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      list.setImportProgress(null);
      toast.error('Failed to import machines', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<Machine>({
    dataColumns,
    segment: 'machines',
    basePath: '/catalog/machines',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Machines & Configuration"
        title="Machines & Configuration"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Machines & Configuration',
          'Manage production machines — type, department, capacity, maintenance schedules, and assigned supervisors.',
          [
            'Search, paginate, and export machines',
            'Import via Excel (upsert by ID or name)',
            'Add, edit, or delete machines',
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
        addHref="/catalog/machines/add"
        addLabel="Add Machine"
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
        emptyIcon="ri-settings-3-line"
        emptyAddLabel="Add First Machine"
      />
    </>
  );
}
