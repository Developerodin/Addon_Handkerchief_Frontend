"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import {
  styleCodeComboService,
  StyleCodeCombo,
} from '@/shared/services/styleCodeComboService';
import { styleCodeService } from '@/shared/services/styleCodeService';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiButton, UiTableColumn } from '@/shared/components/ui';

type Status = 'active' | 'inactive' | '';

const formatMoney = (value?: number) => {
  if (value === undefined || value === null) return '-';
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const parseStatus = (value: unknown): 'active' | 'inactive' => {
  const v = String(value || '').toLowerCase();
  return v === 'inactive' ? 'inactive' : 'active';
};

const getComponentStyleCodeLabel = (comp: StyleCodeCombo['components'][number]): string => {
  const sc = comp.styleCode;
  if (!sc) return '';
  if (typeof sc === 'string') return sc;
  return sc.styleCode || sc.id || '';
};

const formatComponentsCell = (combo: StyleCodeCombo): string => {
  const parts = (combo.components || [])
    .map((c) => {
      const code = getComponentStyleCodeLabel(c);
      if (!code) return '';
      return `${code}:${c.quantity ?? 1}`;
    })
    .filter(Boolean);
  return parts.join(' | ') || '-';
};

/** Parse "STYLECODE:qty | STYLECODE:qty" into [{ code, quantity }] */
const parseComponentsString = (raw: string): Array<{ code: string; quantity: number }> => {
  return String(raw || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [codePart, qtyPart] = part.split(':');
      const code = String(codePart || '').trim();
      const quantity = Number(qtyPart ?? 1);
      return {
        code,
        quantity: !Number.isNaN(quantity) && quantity >= 1 ? quantity : 1,
      };
    })
    .filter((p) => p.code);
};

const dataColumns: UiTableColumn<StyleCodeCombo>[] = [
  {
    key: 'comboCode',
    label: 'Combo Code',
    render: (row) => <span className="font-bold text-gray-900">{row.comboCode}</span>,
  },
  { key: 'eanCode', label: 'EAN', render: (row) => row.eanCode },
  { key: 'mrp', label: 'MRP', render: (row) => formatMoney(row.mrp) },
  { key: 'brand', label: 'Brand', render: (row) => row.brand || '-' },
  { key: 'pack', label: 'Pack', render: (row) => row.pack || '-' },
  {
    key: 'components',
    label: 'Components',
    render: (row) => (
      <span className="text-[11px] font-medium text-gray-600 max-w-[280px] inline-block">
        {formatComponentsCell(row)}
      </span>
    ),
  },
];

export default function StyleCodeCombosPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('style-code-combos');
  const [rows, setRows] = useState<StyleCodeCombo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    void fetchCombos();
  }, [page, limit, search, status]);

  const fetchCombos = async () => {
    try {
      setIsLoading(true);
      const resp = await styleCodeComboService.list({
        search: search || undefined,
        status: status || undefined,
        sortBy: 'comboCode:asc',
        limit,
        page,
      });
      setRows(resp.results || []);
      setTotalPages(resp.totalPages || 1);
      setTotalResults(resp.totalResults || 0);
    } catch (error) {
      console.error('Failed to load combos', error);
      toast.error('Failed to load combos');
      setRows([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Delete this combo?')) return;
    try {
      setDeletingId(id);
      await styleCodeComboService.remove(id);
      toast.success('Combo deleted');
      await fetchCombos();
    } catch (error) {
      console.error('Delete failed', error);
      toast.error('Failed to delete combo');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        ID: '',
        'Combo Code': 'COMBO-001',
        EAN: 'EANCOMBO1',
        MRP: 399,
        Brand: 'Brand A',
        Pack: '2-pack',
        Components: 'SC-001:1 | SC-002:1',
        Status: 'active',
      },
      {
        ID: '',
        'Combo Code': 'COMBO-002',
        EAN: 'EANCOMBO2',
        MRP: 499,
        Brand: 'Brand B',
        Pack: '3-pack',
        Components: 'SC-003:2',
        Status: 'inactive',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Combos');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'style-code-combos-template.xlsx');
    toast.success('Template downloaded');
  };

  const handleExport = async () => {
    try {
      const exportLimit = 500;
      let allRows: StyleCodeCombo[] = [];
      let currentPage = 1;
      let totalToFetch = 1;

      do {
        const resp = await styleCodeComboService.list({
          sortBy: 'comboCode:asc',
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
        toast.error('No combos to export');
        return;
      }

      const exportRows = allRows.map((row) => ({
        ID: row.id,
        'Combo Code': row.comboCode,
        EAN: row.eanCode,
        MRP: row.mrp ?? 0,
        Brand: row.brand ?? '',
        Pack: row.pack ?? '',
        Components: formatComponentsCell(row) === '-' ? '' : formatComponentsCell(row),
        Status: row.status ?? 'active',
      }));
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Combos');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const filename = `style-code-combos-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(blob, filename);
      toast.success(`Exported all ${allRows.length} combo(s)`);
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Export failed');
    }
  };

  const loadStyleCodeMap = async (): Promise<Map<string, string>> => {
    const map = new Map<string, string>();
    let currentPage = 1;
    let totalPagesLocal = 1;
    do {
      const resp = await styleCodeService.list({
        limit: 500,
        page: currentPage,
        sortBy: 'styleCode:asc',
      });
      for (const sc of resp.results || []) {
        if (sc.styleCode && sc.id) {
          map.set(sc.styleCode.trim().toLowerCase(), sc.id);
        }
      }
      totalPagesLocal = resp.totalPages || 1;
      currentPage += 1;
    } while (currentPage <= totalPagesLocal);
    return map;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rowsJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet || {}, { defval: '' });
      if (!rowsJson.length) {
        toast.error('No rows found in file');
        return;
      }

      const styleCodeMap = await loadStyleCodeMap();

      const existingByCode = new Map<string, string>();
      {
        let currentPage = 1;
        let totalPagesLocal = 1;
        do {
          const resp = await styleCodeComboService.list({
            limit: 500,
            page: currentPage,
            sortBy: 'comboCode:asc',
          });
          for (const c of resp.results || []) {
            if (c.comboCode && c.id) existingByCode.set(c.comboCode.trim().toLowerCase(), c.id);
          }
          totalPagesLocal = resp.totalPages || 1;
          currentPage += 1;
        } while (currentPage <= totalPagesLocal);
      }

      let created = 0;
      let updated = 0;
      let failed = 0;

      for (const row of rowsJson) {
        try {
          const comboCode = String(row['Combo Code'] ?? row.comboCode ?? row.ComboCode ?? '').trim();
          const eanCode = String(row.EAN ?? row.eanCode ?? row['EAN Code'] ?? '').trim();
          const mrp = Number(row.MRP ?? row.mrp ?? 0);
          const brand = String(row.Brand ?? row.brand ?? '').trim();
          const pack = String(row.Pack ?? row.pack ?? '').trim();
          const statusVal = parseStatus(row.Status ?? row.status);
          const id = String(row.ID ?? row.id ?? row.Id ?? '').trim();
          const componentsRaw = String(row.Components ?? row.components ?? '').trim();
          const parsedComponents = parseComponentsString(componentsRaw);

          if (!comboCode || !eanCode || Number.isNaN(mrp) || parsedComponents.length === 0) {
            failed += 1;
            continue;
          }

          const components: Array<{ styleCode: string; quantity: number }> = [];
          let resolveFailed = false;
          for (const pc of parsedComponents) {
            const styleCodeId = styleCodeMap.get(pc.code.toLowerCase());
            if (!styleCodeId) {
              resolveFailed = true;
              break;
            }
            components.push({ styleCode: styleCodeId, quantity: pc.quantity });
          }
          if (resolveFailed || components.length === 0) {
            failed += 1;
            continue;
          }

          const payload = {
            comboCode,
            eanCode,
            mrp,
            brand: brand || undefined,
            pack: pack || undefined,
            components,
            status: statusVal,
          };

          const existingId = id || existingByCode.get(comboCode.toLowerCase());
          if (existingId) {
            await styleCodeComboService.update(existingId, payload);
            updated += 1;
          } else {
            const createdCombo = await styleCodeComboService.create(payload);
            if (createdCombo?.id) existingByCode.set(comboCode.toLowerCase(), createdCombo.id);
            created += 1;
          }
        } catch {
          failed += 1;
        }
      }

      toast.success(`Imported: ${created} new, ${updated} updated. Failed: ${failed}`);
      await fetchCombos();
    } catch (error) {
      console.error('Import failed', error);
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const columns = useMemo(
    () =>
      buildCatalogTableColumns<StyleCodeCombo>({
        dataColumns,
        segment: 'style-code-combos',
        basePath: '/catalog/style-code-combos',
        canUpdate,
        canDelete,
        onDelete: handleDelete,
        deleteDisabled: (row) => deletingId === row.id,
        deleteLoading: (row) => deletingId === row.id,
      }),
    [canUpdate, canDelete, deletingId]
  );

  const extraToolbarActions = (
    <>
      <UiButton variant="secondary" href="/catalog/style-codes" icon="ri-arrow-left-line">
        Style Codes
      </UiButton>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as Status)}
        className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
        aria-label="Filter by status"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </>
  );

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Style Code Combos"
        title="Style Code Combos"
        count={totalResults}
        searchQuery={search}
        onSearchChange={setSearch}
        itemsPerPage={limit}
        onItemsPerPageChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Style Code Combos',
          'Bundle multiple style codes into sellable combo products with shared EAN, MRP, and pack details.',
          [
            'Search combos by code, EAN, or brand',
            'Filter by active/inactive status',
            'Import or export combos via Excel with component style codes',
            'Navigate back to style codes to manage individual items',
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
        addHref="/catalog/style-code-combos/add"
        addLabel="Add Combo"
        isLoading={isLoading}
        error={null}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        currentPage={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
        emptyIcon="ri-stack-line"
        emptyAddLabel="Add First Combo"
      >
        {isImporting ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 rounded">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200 border-t-purple-600 mb-3" />
            <p className="text-[11px] font-bold text-gray-700">Importing Excel…</p>
            <p className="text-[10px] text-gray-500 mt-1">Resolving style codes and upserting</p>
          </div>
        ) : null}
      </CatalogListShell>
    </>
  );
}

