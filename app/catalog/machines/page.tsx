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

const MachinesPage = () => {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('machines');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMachines = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listMachines({ page, limit, search });
      setMachines(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch machines');
      setMachines([]);
      setTotalPages(1);
      toast.error('Failed to load machines');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(machines.map((m) => m.id));
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
    if (!window.confirm('Are you sure you want to delete this machine?')) return;
    try {
      await deleteMachine(id);
      setMachines((prev) => prev.filter((m) => m.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Machine deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete machine');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete()) return;
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected machine(s)?`)) return;

    try {
      let hasError = false;
      const results = await Promise.all(
        selectedIds.map(async (id) => {
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
      setMachines((prev) => prev.filter((m) => !successful.includes(m.id)));
      setSelectedIds([]);
      setSelectAll(false);
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
    setImportProgress(0);
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

              if (machineId) {
                await updateMachine(machineId, payload);
              } else {
                await createMachine(payload);
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
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} machines`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} machines`);
          fetchMachines(currentPage, itemsPerPage, searchQuery);
        } catch {
          setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      setImportProgress(null);
      toast.error('Failed to import machines', { id: loadingToast });
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
      <Seo title="Machines & Configuration" />

      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Machines & Configuration</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Machines & Configuration"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        Manage production machines — type, department, capacity, maintenance schedules, and assigned supervisors.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Search, paginate, and export machines</li>
                        <li>Import via Excel (upsert by ID or name)</li>
                        <li>Add, edit, or delete machines</li>
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
                  href="/catalog/machines/add"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add Machine
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
          ) : machines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-settings-3-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              {canCreate && (
                <Link
                  href="/catalog/machines/add"
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add First Machine
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
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Code</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Department</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Floor</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Supervisor</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  {(canUpdate || canDelete) && (
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {machines.map((machine) => (
                  <tr key={machine.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(machine.id)}
                        onChange={() => handleSelect(machine.id)}
                        className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                      />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{machine.name}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{machine.code || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{machineTypeLabel(machine.machineType)}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{departmentLabel(machine.department)}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{machine.floor || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{getUserDisplay(machine.assignedSupervisor)}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
                          machine.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {machine.status || 'active'}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <CatalogRowActions
                          segment="machines"
                          editHref={`/catalog/machines/edit/${machine.id}`}
                          onDelete={() => handleDelete(machine.id)}
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

export default MachinesPage;
