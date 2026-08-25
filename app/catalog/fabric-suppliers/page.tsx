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

const FabricSuppliersPage = () => {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('fabric-suppliers');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [suppliers, setSuppliers] = useState<FabricSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSuppliers = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listFabricSuppliers({ page, limit, search });
      setSuppliers(data.results);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fabric suppliers');
      setSuppliers([]);
      setTotalPages(1);
      toast.error('Failed to load fabric suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map((s) => s.id));
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
    if (!window.confirm('Are you sure you want to delete this fabric supplier?')) return;
    try {
      await deleteFabricSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Fabric supplier deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete fabric supplier');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete()) return;
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected supplier(s)?`)) return;

    try {
      let hasError = false;
      const results = await Promise.all(
        selectedIds.map(async (id) => {
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
      setSuppliers((prev) => prev.filter((s) => !successful.includes(s.id)));
      setSelectedIds([]);
      setSelectAll(false);
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
    setImportProgress(0);
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

              if (supplierId) {
                await updateFabricSupplier(supplierId, payload);
              } else {
                await createFabricSupplier(payload);
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
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} fabric suppliers`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} fabric suppliers`);
          fetchSuppliers(currentPage, itemsPerPage, searchQuery);
        } catch {
          setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      setImportProgress(null);
      toast.error('Failed to import fabric suppliers', { id: loadingToast });
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
      <Seo title="Fabric Suppliers" />

      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Fabric Suppliers</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Fabric Suppliers Management"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        Manage handkerchief fabric suppliers — contact details, GST, payment terms, lead times, and bank information.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Search, paginate, and export suppliers</li>
                        <li>Import via Excel (upsert by ID or name)</li>
                        <li>Add, edit, or delete suppliers</li>
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
                  href="/catalog/fabric-suppliers/add"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add Supplier
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
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-truck-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              {canCreate && (
                <Link
                  href="/catalog/fabric-suppliers/add"
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs"></i> Add First Supplier
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
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Contact Person</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">City</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">GSTIN</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  {(canUpdate || canDelete) && (
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(supplier.id)}
                        onChange={() => handleSelect(supplier.id)}
                        className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                      />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{supplier.name}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{supplier.contactPerson}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{supplier.city || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{supplier.gstin || '—'}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
                          supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {supplier.status}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <CatalogRowActions
                          segment="fabric-suppliers"
                          editHref={`/catalog/fabric-suppliers/edit/${supplier.id}`}
                          onDelete={() => handleDelete(supplier.id)}
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

export default FabricSuppliersPage;
