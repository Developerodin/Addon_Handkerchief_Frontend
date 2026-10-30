'use client';

import React, { useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import {
  ThreadSupplier,
  createThreadSupplier,
  deleteThreadSupplier,
  listThreadSuppliers,
  updateThreadSupplier,
} from '@/shared/services/threadSupplierService';

interface ExcelRow {
  ID?: string;
  Name?: string;
  'Contact Person'?: string;
  'Contact Number'?: string;
  Email?: string;
  Address?: string;
  City?: string;
  State?: string;
  Pincode?: string;
  Country?: string;
  GSTIN?: string;
  'Payment Terms'?: string;
  'Bank Name'?: string;
  'Account Holder'?: string;
  'Account Number'?: string;
  IFSC?: string;
  Status?: string;
}

const excelColWidths = [
  { wch: 24 },
  { wch: 22 },
  { wch: 18 },
  { wch: 14 },
  { wch: 22 },
  { wch: 28 },
  { wch: 14 },
  { wch: 14 },
  { wch: 10 },
  { wch: 12 },
  { wch: 16 },
  { wch: 16 },
  { wch: 18 },
  { wch: 18 },
  { wch: 16 },
  { wch: 12 },
  { wch: 10 },
];

/**
 * Maps a supplier to an Excel row. Thread detail lines stay off the sheet.
 * @param supplier - Supplier row
 */
const toExportRow = (supplier: ThreadSupplier) => ({
  ID: supplier.id,
  Name: supplier.name,
  'Contact Person': supplier.contactPerson,
  'Contact Number': supplier.contactNumber || '',
  Email: supplier.email || '',
  Address: supplier.address,
  City: supplier.city || '',
  State: supplier.state || '',
  Pincode: supplier.pincode || '',
  Country: supplier.country || 'India',
  GSTIN: supplier.gstin || '',
  'Payment Terms': supplier.paymentTerms || '',
  'Bank Name': supplier.bankDetails?.bankName || '',
  'Account Holder': supplier.bankDetails?.accountHolder || '',
  'Account Number': supplier.bankDetails?.accountNumber || '',
  IFSC: supplier.bankDetails?.ifsc || '',
  Status: supplier.status,
});

const dataColumns: UiTableColumn<ThreadSupplier>[] = [
  { key: 'name', label: 'Name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
  { key: 'contactPerson', label: 'Contact Person', render: (row) => row.contactPerson },
  { key: 'city', label: 'City', render: (row) => row.city || '—' },
  { key: 'gstin', label: 'GSTIN', render: (row) => row.gstin || '—' },
];

/**
 * Thread supplier list with search, Excel import, and Excel export.
 */
function ThreadSuppliersPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('thread-suppliers');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useCatalogListState<ThreadSupplier>({
    fetchFn: listThreadSuppliers,
    errorMessage: 'Failed to fetch thread suppliers',
  });

  /**
   * Deletes one supplier after confirmation.
   * @param id - Supplier id
   */
  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this thread supplier?')) return;
    try {
      await deleteThreadSupplier(id);
      list.setRows((prev) => prev.filter((row) => row.id !== id));
      list.setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Thread supplier deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete thread supplier');
    }
  };

  /**
   * Deletes every selected supplier.
   */
  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected supplier(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            await deleteThreadSupplier(id);
            return id;
          } catch (error) {
            console.error('Failed to delete thread supplier', id, error);
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((row) => !successful.includes(row.id)));
      list.clearSelection();
      if (hasError) toast.error('Some thread suppliers could not be deleted');
      else toast.success('Selected thread suppliers deleted successfully');
    } catch (error) {
      console.error('Failed to delete selected thread suppliers', error);
      toast.error('Failed to delete some thread suppliers');
    }
  };

  /**
   * Downloads an Excel template for supplier headers.
   */
  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          Name: 'Surat Thread House',
          'Contact Person': 'Ravi Patel',
          'Contact Number': '9876543210',
          Email: 'ravi@suratthread.com',
          Address: '12 Textile Market, Ring Road',
          City: 'Surat',
          State: 'Gujarat',
          Pincode: '395002',
          Country: 'India',
          GSTIN: '24AABCU9603R1ZM',
          'Payment Terms': 'Net 30',
          'Bank Name': 'HDFC Bank',
          'Account Holder': 'Surat Thread House',
          'Account Number': '50100123456789',
          IFSC: 'HDFC0001234',
          Status: 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Thread Supplier Template');
      XLSX.writeFile(wb, 'thread_supplier_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  /**
   * Exports supplier headers. Thread detail lines are not included.
   */
  const handleExport = async () => {
    try {
      const data = await listThreadSuppliers({ page: 1, limit: 100000 });
      const ws = XLSX.utils.json_to_sheet(data.results.map(toExportRow));
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Thread Suppliers');
      XLSX.writeFile(wb, `thread_suppliers_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Thread suppliers exported successfully');
    } catch (err) {
      console.error('Error exporting thread suppliers:', err);
      toast.error('Failed to export thread suppliers');
    }
  };

  /**
   * Imports supplier headers from Excel, matching by id or name.
   * @param e - File input change
   */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing thread suppliers...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;
          const allData = await listThreadSuppliers({ page: 1, limit: 100000 });
          const allSuppliers = allData.results;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const name = (row.Name || '').toString().trim();
              const contactPerson = (row['Contact Person'] || '').toString().trim();
              const address = (row.Address || '').toString().trim();
              if (!name || !contactPerson || !address) throw new Error('Missing required fields');

              const payload = {
                name,
                contactPerson,
                contactNumber: (row['Contact Number'] || '').toString().trim(),
                email: (row.Email || '').toString().trim(),
                address,
                city: (row.City || '').toString().trim(),
                state: (row.State || '').toString().trim(),
                pincode: (row.Pincode || '').toString().trim(),
                country: (row.Country || 'India').toString().trim() || 'India',
                gstin: (row.GSTIN || '').toString().trim(),
                paymentTerms: (row['Payment Terms'] || '').toString().trim(),
                bankDetails: {
                  bankName: (row['Bank Name'] || '').toString().trim(),
                  accountHolder: (row['Account Holder'] || '').toString().trim(),
                  accountNumber: (row['Account Number'] || '').toString().trim(),
                  ifsc: (row.IFSC || '').toString().trim(),
                },
                status: (row.Status?.toString()?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as
                  | 'active'
                  | 'inactive',
              };

              let supplierId = row.ID?.toString().trim();
              if (!supplierId) {
                const found = allSuppliers.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
                if (found) supplierId = found.id;
              }

              if (supplierId) await updateThreadSupplier(supplierId, payload);
              else await createThreadSupplier(payload);
              successCount++;
            } catch (error) {
              console.error('Failed to import thread supplier row', error);
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} thread suppliers`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} thread suppliers`);
          list.refresh();
        } catch (error) {
          console.error('Failed to process thread supplier import', error);
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.onerror = () => {
        list.setImportProgress(null);
        toast.error('Failed to read import file', { id: loadingToast });
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Failed to import thread suppliers', error);
      list.setImportProgress(null);
      toast.error('Failed to import thread suppliers', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<ThreadSupplier>({
    dataColumns,
    segment: 'thread-suppliers',
    basePath: '/catalog/thread-suppliers',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Thread Suppliers"
        title="Thread Suppliers"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Thread Suppliers',
          'Manage thread suppliers — contact details, GST, payment terms, bank information, and thread catalog lines.',
          [
            'Search, paginate, and export suppliers',
            'Import via Excel (upsert by ID or name). Thread lines are edited on the form.',
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
        addHref="/catalog/thread-suppliers/add"
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

/**
 * List page. Hidden unless Thread Suppliers read is granted.
 */
export default function ThreadSuppliersPageGuard() {
  return (
    <RequireCrudPermission path="Catalog.Thread Suppliers" action="read">
      <ThreadSuppliersPage />
    </RequireCrudPermission>
  );
}
