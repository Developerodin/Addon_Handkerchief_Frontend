"use client"
import React, { useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import {
  FabricCatalog,
  createFabricCatalog,
  deleteFabricCatalog,
  getLookupName,
  listFabricCatalogs,
  updateFabricCatalog,
} from '@/shared/services/fabricCatalogService';
import {
  fabricTypeApi,
  fabricColorApi,
  fabricQualityApi,
  fabricYarnApi,
  fabricCountApi,
  fabricMeasurementApi,
} from '@/shared/services/fabricLookupService';
import {
  normalizeFabricDesign,
  normalizeFabricFinish,
  normalizeFabricWash,
} from '@/shared/constants/handkerchiefCatalog';

interface ExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Fabric Sort No.'?: string;
  'Mill Old Fabric Sort No.'?: string;
  'Mill New Fabric Sort No.'?: string;
  'Fabric Type'?: string;
  'Color'?: string;
  'Quality'?: string;
  'Yarn'?: string;
  'Count'?: string;
  'Construction'?: string;
  'Weave'?: string;
  'Design'?: string;
  'Wash'?: string;
  'Finish'?: string;
  'GLM'?: string | number;
  'GLM Measurement'?: string;
  'Finished Width'?: string | number;
  'Finished Width Measurement'?: string;
  'Rate'?: string | number;
  'GST'?: string;
  'HSN Code'?: string;
  'Min Quantity in Kg'?: string | number;
  'Status'?: string;
  'Remarks'?: string;
}

const excelColWidths = Array.from({ length: 25 }, () => ({ wch: 16 }));

const toExportRow = (fabric: FabricCatalog) => ({
  'ID': fabric.id,
  'Name': fabric.name,
  'Fabric Sort No.': fabric.fabricSortNo || '',
  'Mill Old Fabric Sort No.': fabric.millOldFabricSortNo || '',
  'Mill New Fabric Sort No.': fabric.millNewFabricSortNo || '',
  'Fabric Type': fabric.fabricTypeName || getLookupName(fabric.fabricType),
  'Color': fabric.colourName || getLookupName(fabric.color),
  'Quality': fabric.qualityName || getLookupName(fabric.quality),
  'Yarn': fabric.yarnName || getLookupName(fabric.yarn),
  'Count': fabric.countName || getLookupName(fabric.count),
  'Construction': fabric.construction || '',
  'Weave': fabric.weave || '',
  'Design': fabric.design || '',
  'Wash': fabric.wash || '',
  'Finish': fabric.finish || '',
  'GLM': fabric.glm ?? '',
  'GLM Measurement': fabric.glmMeasurementName || getLookupName(fabric.glmMeasurement),
  'Finished Width': fabric.finishedWidth ?? '',
  'Finished Width Measurement':
    fabric.finishedWidthMeasurementName || getLookupName(fabric.finishedWidthMeasurement),
  'Rate': fabric.rate ?? '',
  'GST': fabric.gst || '',
  'HSN Code': fabric.hsnCode || '',
  'Min Quantity in Kg': fabric.minQuantity ?? '',
  'Status': fabric.status,
  'Remarks': fabric.remark || '',
});

const parseNumber = (value: string | number | undefined, fallback = 0): number => {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const fabricDataColumns: UiTableColumn<FabricCatalog>[] = [
  { key: 'name', label: 'Name', render: (row) => <span className="font-bold text-gray-900">{row.name}</span> },
  { key: 'fabricSortNo', label: 'Sort No', render: (row) => row.fabricSortNo || '—' },
  { key: 'millOld', label: 'Mill Old', render: (row) => row.millOldFabricSortNo || '—' },
  { key: 'millNew', label: 'Mill New', render: (row) => row.millNewFabricSortNo || '—' },
  { key: 'type', label: 'Type', render: (row) => row.fabricTypeName || getLookupName(row.fabricType) || '—' },
  { key: 'color', label: 'Color', render: (row) => row.colourName || getLookupName(row.color) || '—' },
  { key: 'quality', label: 'Quality', render: (row) => row.qualityName || getLookupName(row.quality) || '—' },
  { key: 'yarn', label: 'Yarn', render: (row) => row.yarnName || getLookupName(row.yarn) || '—' },
  { key: 'count', label: 'Count', render: (row) => row.countName || getLookupName(row.count) || '—' },
  { key: 'design', label: 'Design', render: (row) => row.design || '—' },
  { key: 'wash', label: 'Wash', render: (row) => row.wash || '—' },
  { key: 'finish', label: 'Finish', render: (row) => row.finish || '—' },
  { key: 'glm', label: 'GLM', render: (row) => (row.glm ?? '—') },
  { key: 'rate', label: 'Rate', render: (row) => (row.rate ?? '—') },
];

const FabricMasterPage = () => {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('fabric');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useCatalogListState<FabricCatalog>({
    fetchFn: listFabricCatalogs,
    errorMessage: 'Failed to fetch fabric catalogs',
  });
  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this fabric?')) return;
    try {
      await deleteFabricCatalog(id);
      list.setRows((prev) => prev.filter((f) => f.id !== id));
      list.setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Fabric deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete fabric');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected fabric(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            await deleteFabricCatalog(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((f) => !successful.includes(f.id)));
      list.clearSelection();
      if (hasError) toast.error('Some fabrics could not be deleted');
      else toast.success('Selected fabrics deleted successfully');
    } catch {
      toast.error('Failed to delete some fabrics');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          Name: 'White Cotton Voile',
          'Fabric Sort No.': 'FC-VOILE-01',
          'Mill Old Fabric Sort No.': '17223',
          'Mill New Fabric Sort No.': 'AW0017223AB0586',
          'Fabric Type': 'Voile',
          Color: 'White',
          Quality: 'Premium',
          Yarn: "60's",
          Count: '60COMPX60COMP',
          Construction: '92x80',
          Weave: 'Plain',
          Design: 'Plain',
          Wash: 'Yes',
          Finish: 'NA',
          GLM: 60,
          'GLM Measurement': 'GSM',
          'Finished Width': 44,
          'Finished Width Measurement': 'Inch',
          Rate: 85,
          GST: '5',
          'HSN Code': '52082100',
          'Min Quantity in Kg': 50,
          Status: 'active',
          Remarks: 'Handkerchief base fabric',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fabric Master Template');
      XLSX.writeFile(wb, 'fabric_master_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const data = await listFabricCatalogs({ page: 1, limit: 100000 });
      const exportData = data.results.map(toExportRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = excelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fabric Master');
      XLSX.writeFile(wb, `fabric_master_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Fabric master exported successfully');
    } catch (err) {
      console.error('Error exporting fabric master:', err);
      toast.error('Failed to export fabric master');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing fabric master...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;

          const [allData, typesData, colorsData, qualitiesData, yarnsData, countsData, measurementsData] =
            await Promise.all([
            listFabricCatalogs({ page: 1, limit: 100000 }),
            fabricTypeApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricColorApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricQualityApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricYarnApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricCountApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricMeasurementApi.list({ page: 1, limit: 1000, status: 'active' }),
          ]);
          const allFabrics = allData.results;
          const resolveByName = <T extends { id: string; name: string }>(items: T[], label?: string) =>
            label ? items.find((item) => item.name.trim().toLowerCase() === label.trim().toLowerCase())?.id || null : null;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const name = (row['Name'] || '').toString().trim();
              if (!name) throw new Error('Name is required');

              const payload = {
                name,
                fabricSortNo: (row['Fabric Sort No.'] || '').toString().trim(),
                millOldFabricSortNo: (row['Mill Old Fabric Sort No.'] || '').toString().trim(),
                millNewFabricSortNo: (row['Mill New Fabric Sort No.'] || '').toString().trim(),
                fabricType: resolveByName(typesData.results, (row['Fabric Type'] || '').toString()),
                color: resolveByName(colorsData.results, (row['Color'] || '').toString()),
                quality: resolveByName(qualitiesData.results, (row['Quality'] || '').toString()),
                yarn: resolveByName(yarnsData.results, (row['Yarn'] || '').toString()),
                count: resolveByName(countsData.results, (row['Count'] || '').toString()),
                construction: (row['Construction'] || '').toString().trim(),
                weave: (row['Weave'] || '').toString().trim(),
                design: normalizeFabricDesign((row['Design'] || '').toString()),
                wash: normalizeFabricWash((row['Wash'] || '').toString()),
                finish: normalizeFabricFinish((row['Finish'] || '').toString()),
                glm: parseNumber(row['GLM']),
                glmMeasurement: resolveByName(measurementsData.results, (row['GLM Measurement'] || '').toString()),
                finishedWidth: parseNumber(row['Finished Width']),
                finishedWidthMeasurement: resolveByName(
                  measurementsData.results,
                  (row['Finished Width Measurement'] || '').toString()
                ),
                rate: parseNumber(row['Rate']),
                gst: (row['GST'] || '').toString().trim(),
                hsnCode: (row['HSN Code'] || '').toString().trim(),
                minQuantity: parseNumber(row['Min Quantity in Kg']),
                status: (row['Status']?.toString()?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as
                  | 'active'
                  | 'inactive',
                remark: (row['Remarks'] || row['Remark'] || '').toString().trim(),
              };

              let fabricId = row['ID']?.toString().trim();
              if (!fabricId) {
                const found = allFabrics.find(
                  (f) => f.name.trim().toLowerCase() === name.toLowerCase()
                );
                if (found) fabricId = found.id;
              }

              if (fabricId) {
                await updateFabricCatalog(fabricId, payload);
              } else {
                await createFabricCatalog(payload);
              }
              successCount++;
            } catch {
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} fabrics`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} fabrics`);
          list.refresh();
        } catch {
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      list.setImportProgress(null);
      toast.error('Failed to import fabric master', { id: loadingToast });
    }
  };

  const columns = buildCatalogTableColumns<FabricCatalog>({
    dataColumns: fabricDataColumns,
    segment: 'fabric',
    basePath: '/catalog/fabric',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Fabric master"
        title="Fabric master"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Fabric Master Management',
          'Manage handkerchief fabric catalog — mill sort numbers, type, color, quality, yarn, count, design, wash, finish, GLM, finished width, rate, HSN/GST, and remarks.',
          [
            'Search, paginate, and export fabrics',
            'Import via Excel (upsert by ID or name; resolve lookups by name)',
            'Add, edit, or delete fabric records',
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
        addHref="/catalog/fabric/add"
        addLabel="Add Fabric"
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
        emptyIcon="ri-shirt-line"
        emptyAddLabel="Add First Fabric"
      />
    </>
  );
};

export default FabricMasterPage;
