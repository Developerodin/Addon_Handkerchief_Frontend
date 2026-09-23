"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiButton, UiTableColumn } from '@/shared/components/ui';

type Status = 'active' | 'inactive' | '';

interface Filters {
  search: string;
  status: Status;
}

const formatMoney = (value?: number) => {
  if (value === undefined || value === null) return '-';
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

/** Extract BOM from row: BOM 1 Raw Material, BOM 1 Quantity, BOM 2 Raw Material, etc. */
const extractBomFromRow = (row: Record<string, unknown>): Array<{ rawMaterial: string; quantity: number }> => {
  const bom: Array<{ rawMaterial: string; quantity: number }> = [];
  const keys = Object.keys(row);
  const indices = new Set<number>();
  for (const k of keys) {
    const m = k.match(/bom\s*(\d+)/i);
    if (m) indices.add(parseInt(m[1], 10));
  }
  for (const i of Array.from(indices).sort((a, b) => a - b)) {
    const qtyKey = keys.find((k) => {
      const n = k.replace(/_/g, ' ').toLowerCase();
      return n.includes(`bom ${i}`) && (n.includes('quantity') || n.includes('qty'));
    });
    const rawKey = keys.find((k) => {
      const n = k.replace(/_/g, ' ').toLowerCase();
      if (!n.includes(`bom ${i}`) || n.includes('quantity') || n.includes('qty')) return false;
      return true;
    });
    const rawMaterial = rawKey ? String(row[rawKey] ?? '').trim() : '';
    const quantity = qtyKey ? Number(row[qtyKey] ?? 0) : 0;
    if (rawMaterial && !Number.isNaN(quantity) && quantity >= 0) {
      bom.push({ rawMaterial, quantity });
    }
  }
  return bom;
};

const dataColumns: UiTableColumn<StyleCode>[] = [
  {
    key: 'styleCode',
    label: 'Style Code',
    render: (row) => <span className="font-bold text-gray-900">{row.styleCode}</span>,
  },
  { key: 'eanCode', label: 'EAN', render: (row) => row.eanCode },
  { key: 'mrp', label: 'MRP', render: (row) => formatMoney(row.mrp) },
  { key: 'brand', label: 'Brand', render: (row) => row.brand || '-' },
  { key: 'pack', label: 'Pack', render: (row) => row.pack || '-' },
  { key: 'bundleQty', label: 'Bundle', render: (row) => row.bundleQty ?? 60 },
  { key: 'cartonQty', label: 'Carton', render: (row) => row.cartonQty ?? 120 },
];

export default function StyleCodesPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('style-codes');
  const [rows, setRows] = useState<StyleCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState<Filters>({ search: '', status: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isBomImporting, setIsBomImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const bomImportInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status]);

  useEffect(() => {
    void fetchStyleCodes();
  }, [page, limit, filters]);

  const fetchStyleCodes = async () => {
    try {
      setIsLoading(true);
      const resp = await styleCodeService.list({
        styleCode: filters.search || undefined,
        eanCode: filters.search || undefined,
        brand: filters.search || undefined,
        pack: filters.search || undefined,
        status: filters.status || undefined,
        sortBy: 'styleCode:asc',
        limit,
        page,
      });
      setRows(resp.results || []);
      setTotalPages(resp.totalPages || 1);
      setTotalResults(resp.totalResults || 0);
    } catch (error) {
      console.error('Failed to load style codes', error);
      toast.error('Failed to load style codes');
      setRows([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Delete this style code?')) return;
    try {
      setDeletingId(id);
      await styleCodeService.remove(id);
      toast.success('Style code deleted');
      await fetchStyleCodes();
    } catch (error) {
      console.error('Delete failed', error);
      toast.error('Failed to delete style code');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: Status) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        styleCode: 'SC-001',
        eanCode: 'EAN123',
        mrp: 199,
        brand: 'Brand A',
        pack: '2-pack',
        'Bundle Qty': 60,
        'Carton Qty': 120,
        status: 'active',
      },
      {
        styleCode: 'SC-002',
        eanCode: 'EAN456',
        mrp: 249,
        brand: 'Brand B',
        pack: '3-pack',
        'Bundle Qty': 60,
        'Carton Qty': 120,
        status: 'inactive',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Style Codes');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'style-codes-template.xlsx');
    toast.success('Template downloaded');
  };

  const handleExport = async () => {
    try {
      const exportLimit = 500;
      let allRows: StyleCode[] = [];
      let currentPage = 1;
      let totalToFetch = 1;

      do {
        const resp = await styleCodeService.list({
          sortBy: 'styleCode:asc',
          limit: exportLimit,
          page: currentPage,
        });
        const results = resp.results || [];
        allRows = allRows.concat(results);
        totalToFetch = resp.totalResults ?? allRows.length;
        if (results.length < exportLimit || allRows.length >= totalToFetch) break;
        currentPage += 1;
      } while (allRows.length < totalToFetch);

      if (allRows.length === 0) {
        toast.error('No style codes to export');
        return;
      }

      const exportRows = allRows.map((row) => ({
        id: row.id,
        styleCode: row.styleCode,
        eanCode: row.eanCode,
        mrp: row.mrp ?? 0,
        brand: row.brand ?? '',
        pack: row.pack ?? '',
        'Bundle Qty': row.bundleQty ?? 60,
        'Carton Qty': row.cartonQty ?? 120,
        status: row.status ?? 'active',
      }));
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Style Codes');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const filename = `style-codes-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(blob, filename);
      toast.success(`Exported all ${allRows.length} style code(s)`);
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Export failed');
    }
  };

  const parseStatus = (value: unknown): 'active' | 'inactive' => {
    const v = String(value || '').toLowerCase();
    return v === 'inactive' ? 'inactive' : 'active';
  };

  const parseStyleCodesFromRows = (rowsJson: Record<string, unknown>[]) =>
    rowsJson
      .map((row) => {
        const bundleRaw = row.bundleQty ?? row['Bundle Qty'] ?? row.BundleQty;
        const cartonRaw = row.cartonQty ?? row['Carton Qty'] ?? row.CartonQty;
        const bundleQty =
          bundleRaw === '' || bundleRaw === undefined || bundleRaw === null ? 60 : Number(bundleRaw);
        const cartonQty =
          cartonRaw === '' || cartonRaw === undefined || cartonRaw === null ? 120 : Number(cartonRaw);
        return {
          styleCode: String(row.styleCode || row.StyleCode || row['Style Code'] || '').trim(),
          eanCode: String(row.eanCode || row.EAN || row['eanCode'] || '').trim(),
          mrp: Number(row.mrp ?? row.MRP ?? 0),
          brand: String(row.brand || row.Brand || '').trim() || undefined,
          pack: String(row.pack || row.Pack || '').trim() || undefined,
          bundleQty: !Number.isNaN(bundleQty) && bundleQty >= 1 ? bundleQty : 60,
          cartonQty: !Number.isNaN(cartonQty) && cartonQty >= 1 ? cartonQty : 120,
          status: parseStatus(row.status || row.Status),
        };
      })
      .filter((r) => r.styleCode && r.eanCode && !Number.isNaN(r.mrp));

  const readExcelFirstSheetRows = async (file: File): Promise<Record<string, unknown>[]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet || {}, { defval: '' });
  };

  const handleDownloadBomTemplate = () => {
    const templateRows = [
      {
        styleCodeId: '69bd044ab399809ef74b0e26',
        'BOM 1 Raw Material': '6841517d98f9ff407c4e9ada',
        'BOM 1 Quantity': 1000,
        'BOM 2 Raw Material': '684a71ec9db38a0bfcaf67d1',
        'BOM 2 Quantity': 100,
        'BOM 3 Raw Material': '',
        'BOM 3 Quantity': '',
      },
      {
        styleCodeId: '69bd044ab399809ef74b0e27',
        'BOM 1 Raw Material': '6841517d98f9ff407c4e9ada',
        'BOM 1 Quantity': 500,
        'BOM 2 Raw Material': '',
        'BOM 2 Quantity': '',
      },
    ];
    const instructions = [
      { Field: 'styleCodeId', Description: 'Style code ID (required)' },
      {
        Field: 'BOM 1 Raw Material, BOM 1 Quantity, BOM 2...',
        Description: 'Add BOM 1 Raw Material, BOM 1 Quantity, BOM 2 Raw Material, BOM 2 Quantity, etc.',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wsInst = XLSX.utils.json_to_sheet(instructions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOM');
    XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'style-codes-bom-template.xlsx');
    toast.success('BOM template downloaded');
  };

  const handleBomImportClick = () => bomImportInputRef.current?.click();

  const handleBomImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsBomImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rowsJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet || {}, { defval: '' });
      if (!rowsJson.length) {
        toast.error('No rows found in file');
        return;
      }
      const items = rowsJson
        .map((row) => {
          const r = row as Record<string, unknown>;
          const styleCodeId = String(r.styleCodeId ?? r['Style Code ID'] ?? r['styleCodeId'] ?? '').trim();
          const bom = extractBomFromRow(r);
          if (!styleCodeId || bom.length === 0) return null;
          return { styleCodeId, bom };
        })
        .filter(
          (x): x is { styleCodeId: string; bom: Array<{ rawMaterial: string; quantity: number }> } => x !== null
        );

      if (items.length === 0) {
        toast.error('No valid rows. Need styleCodeId and bom.');
        return;
      }

      const summary = await styleCodeService.bulkImportBom({
        items,
        batchSize: Math.min(items.length, 50),
      });
      toast.success(`BOM imported: ${summary.updated ?? summary.created ?? 0} updated. Failed: ${summary.failed}`);
      await fetchStyleCodes();
    } catch (error) {
      console.error('BOM import failed', error);
      toast.error('BOM import failed');
    } finally {
      setIsBomImporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsImporting(true);
    try {
      const rowsJson = await readExcelFirstSheetRows(file);
      if (!rowsJson.length) {
        toast.error('No rows found in file');
        return;
      }
      const styleCodes = parseStyleCodesFromRows(rowsJson);

      if (styleCodes.length === 0) {
        toast.error('No valid style codes in file');
        return;
      }

      const summary = await styleCodeService.bulkImport({
        styleCodes,
        batchSize: Math.min(styleCodes.length, 500),
      });

      toast.success(`Imported: ${summary.created} new, ${summary.updated} updated. Failed: ${summary.failed}`);
      await fetchStyleCodes();
    } catch (error) {
      console.error('Import failed', error);
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const columns = useMemo(
    () =>
      buildCatalogTableColumns<StyleCode>({
        dataColumns,
        segment: 'style-codes',
        basePath: '/catalog/style-codes',
        canUpdate,
        canDelete,
        getEditHref: (row) => `/catalog/style-codes/${row.id}/edit`,
        onDelete: handleDelete,
        deleteDisabled: (row) => deletingId === row.id,
        deleteLoading: (row) => deletingId === row.id,
      }),
    [canUpdate, canDelete, deletingId]
  );

  const extraToolbarActions = (
    <>
      <select
        value={filters.status}
        onChange={(e) => handleStatusChange(e.target.value as Status)}
        className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
        aria-label="Filter by status"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <UiButton variant="secondary" icon="ri-file-list-3-line" onClick={handleDownloadBomTemplate}>
        BOM Template
      </UiButton>
      {canImport ? (
        <>
          <UiButton
            variant="secondary"
            icon="ri-stack-line"
            onClick={handleBomImportClick}
            disabled={isBomImporting || isImporting}
            loading={isBomImporting}
          >
            BOM Import
          </UiButton>
          <input
            ref={bomImportInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleBomImport}
          />
        </>
      ) : null}
      <UiButton variant="secondary" href="/catalog/style-code-combos" icon="ri-stack-line">
        Combos
      </UiButton>
    </>
  );

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Style Codes"
        title="Style Codes"
        count={totalResults}
        searchQuery={filters.search}
        onSearchChange={handleSearchChange}
        itemsPerPage={limit}
        onItemsPerPageChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Style Codes',
          'Manage sellable style codes with EAN, MRP, brand, pack, and bundle/carton quantities.',
          [
            'Search by style code, EAN, brand, or pack',
            'Filter by active/inactive status',
            'Import style codes or BOM assignments from Excel',
            'Export all style codes or download templates',
          ]
        )}
        extraToolbarActions={extraToolbarActions}
        canImport={canImport}
        fileInputRef={importInputRef}
        onImportClick={() => importInputRef.current?.click()}
        onImportChange={handleImport}
        onExportTemplate={handleDownloadTemplate}
        onExport={handleExport}
        canCreate={canCreate}
        addHref="/catalog/style-codes/add"
        addLabel="Add Style Code"
        isLoading={isLoading}
        error={null}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        currentPage={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
        emptyIcon="ri-purchase-tag-line"
        emptyAddLabel="Add First Style Code"
      >
        {isImporting || isBomImporting ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 rounded">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200 border-t-purple-600 mb-3" />
            <p className="text-[11px] font-bold text-gray-700">
              {isBomImporting ? 'Importing BOM…' : 'Importing Excel…'}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Uploading and processing</p>
          </div>
        ) : null}
      </CatalogListShell>
    </>
  );
}
