"use client";

import React, { useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import {
  FabricSupplier,
  createFabricSupplier,
  deleteFabricSupplier,
  listFabricSuppliers,
  updateFabricSupplier,
} from '@/shared/services/fabricSupplierService';

interface ExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Contact Person'?: string;
  'Contact Number'?: string;
  'Email'?: string;
  'Address'?: string;
  'City'?: string;
  'State'?: string;
  'Pincode'?: string;
  'Country'?: string;
  'GSTIN'?: string;
  'Payment Terms'?: string;
  'Fabric Mill'?: string;
  'Bank Name'?: string;
  'Account Holder'?: string;
  'Account Number'?: string;
  'IFSC'?: string;
  'Status'?: string;
}

const excelColWidths = [
  { wch: 24 }, { wch: 22 }, { wch: 18 }, { wch: 14 },
  { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
  { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 18 },
  { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 10 },
];

const toExportRow = (supplier: FabricSupplier) => ({
  'ID': supplier.id,
  'Name': supplier.name,
  'Contact Person': supplier.contactPerson,
  'Contact Number': supplier.contactNumber || '',
  'Email': supplier.email || '',
  'Address': supplier.address,
  'City': supplier.city || '',
  'State': supplier.state || '',
  'Pincode': supplier.pincode || '',
  'Country': supplier.country || 'India',
  'GSTIN': supplier.gstin || '',
  'Payment Terms': supplier.paymentTerms || '',
  'Fabric Mill': supplier.fabricMill || '',
  'Bank Name': supplier.bankDetails?.bankName || '',
  'Account Holder': supplier.bankDetails?.accountHolder || '',
  'Account Number': supplier.bankDetails?.accountNumber || '',
  'IFSC': supplier.bankDetails?.ifsc || '',
  'Status': supplier.status,
});

const dataColumns: UiTableColumn<FabricSupplier>[] = [
  { key: 'name', label: 'Name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
  { key: 'contactPerson', label: 'Contact Person', render: (row) => row.contactPerson },
  { key: 'city', label: 'City', render: (row) => row.city || '—' },
  { key: 'gstin', label: 'GSTIN', render: (row) => row.gstin || '—' },
];

export default function FabricSuppliersPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('fabric-suppliers');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useCatalogListState<FabricSupplier>({
    fetchFn: listFabricSuppliers,
    errorMessage: 'Failed to fetch fabric suppliers',
  });

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this fabric supplier?')) return;
    try {
      await deleteFabricSupplier(id);
      list.setRows((prev) => prev.filter((s) => s.id !== id));
      list.setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Fabric supplier deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete fabric supplier');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected supplier(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            await deleteFabricSupplier(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((s) => !successful.includes(s.id)));
      list.clearSelection();
      if (hasError) toast.error('Some fabric suppliers could not be deleted');
      else toast.success('Selected fabric suppliers deleted successfully');
    } catch {
      toast.error('Failed to delete some fabric suppliers');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Name': 'Surat Weave Mills',
          'Contact Person': 'Ravi Patel',
          'Contact Number': '9876543210',
          'Email': 'ravi@suratweave.com',
          'Address': '12 Textile Market, Ring Road',
          'City': 'Surat',
          'State': 'Gujarat',
          'Pincode': '395002',
          'Country': 'India',
          'GSTIN': '24AABCU9603R1ZM',
          'Payment Terms': 'Net 30',
          'Fabric Mill': 'Surat Weave Mills',
          'Bank Name': 'HDFC Bank',
          'Account Holder': 'Surat Weave Mills',
          'Account Number': '50100123456789',
          'IFSC': 'HDFC0001234',
          'Status': 'active',
        },
        {
          'Name': 'Coimbatore Soft Cloth',
          'Contact Person': 'Meena Krishnan',
          'Contact Number': '9123456780',
          'Email': 'meena@cscotton.in',
          'Address': '45 Avinashi Road',
          'City': 'Coimbatore',
          'State': 'Tamil Nadu',
          'Pincode': '641018',
          'Country': 'India',
          'GSTIN': '33AABCU9603R1ZN',
          'Payment Terms': 'Advance 50%',
          'Fabric Mill': 'Coimbatore Soft Cloth',
          'Bank Name': 'SBI',
          'Account Holder': 'Coimbatore Soft Cloth',
          'Account Number': '30123456789',
          'IFSC': 'SBIN0005678',
          'Status': 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fabric Supplier Template');
      XLSX.writeFile(wb, 'fabric_supplier_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const data = await listFabricSuppliers({ page: 1, limit: 100000 });
      const exportData = data.results.map(toExportRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fabric Suppliers');
      XLSX.writeFile(wb, `fabric_suppliers_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Fabric suppliers exported successfully');
    } catch (err) {
      console.error('Error exporting fabric suppliers:', err);
      toast.error('Failed to export fabric suppliers');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing fabric suppliers...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;

          const allData = await listFabricSuppliers({ page: 1, limit: 100000 });
          const allSuppliers = allData.results;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const name = (row['Name'] || '').toString().trim();
              const contactPerson = (row['Contact Person'] || '').toString().trim();
              const address = (row['Address'] || '').toString().trim();
              if (!name || !contactPerson || !address) throw new Error('Missing required fields');

              const payload = {
                name,
                contactPerson,
                contactNumber: (row['Contact Number'] || '').toString().trim(),
                email: (row['Email'] || '').toString().trim(),
                address,
                city: (row['City'] || '').toString().trim(),
                state: (row['State'] || '').toString().trim(),
                pincode: (row['Pincode'] || '').toString().trim(),
                country: (row['Country'] || 'India').toString().trim() || 'India',
                gstin: (row['GSTIN'] || '').toString().trim(),
                paymentTerms: (row['Payment Terms'] || '').toString().trim(),
                fabricMill: (row['Fabric Mill'] || '').toString().trim(),
                bankDetails: {
                  bankName: (row['Bank Name'] || '').toString().trim(),
                  accountHolder: (row['Account Holder'] || '').toString().trim(),
                  accountNumber: (row['Account Number'] || '').toString().trim(),
                  ifsc: (row['IFSC'] || '').toString().trim(),
                },
                status: (row['Status']?.toString()?.toLowerCase() === 'active' ? 'active' : 'inactive') as
                  | 'active'
                  | 'inactive',
              };

              let supplierId = row['ID']?.toString().trim();
              if (!supplierId) {
                const found = allSuppliers.find(
                  (s) => s.name.trim().toLowerCase() === name.toLowerCase()
                );
                if (found) supplierId = found.id;
              }

              if (supplierId) await updateFabricSupplier(supplierId, payload);
              else await createFabricSupplier(payload);
              successCount++;
            } catch {
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} fabric suppliers`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} fabric suppliers`);
          list.refresh();
        } catch {
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      list.setImportProgress(null);
      toast.error('Failed to import fabric suppliers', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<FabricSupplier>({
    dataColumns,
    segment: 'fabric-suppliers',
    basePath: '/catalog/fabric-suppliers',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Fabric Suppliers"
        title="Fabric Suppliers"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Fabric Suppliers Management',
          'Manage handkerchief fabric suppliers — contact details, GST, payment terms, lead times, and bank information.',
          [
            'Search, paginate, and export suppliers',
            'Import via Excel (upsert by ID or name)',
            'Add, edit, or delete suppliers',
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
        addHref="/catalog/fabric-suppliers/add"
        addLabel="Add Supplier"
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
        emptyIcon="ri-truck-line"
        emptyAddLabel="Add First Supplier"
      />
    </>
  );
}
