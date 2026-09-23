"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';

interface AttributeValue {
  id: number;
  name: string;
  image: string | null;
  sortOrder: number;
}

interface CategoryRef {
  id?: string;
  _id?: string;
  name?: string;
}

interface Attribute {
  id: number;
  name: string;
  type: string;
  attributeType?: string;
  required?: boolean;
  appliesToCategory?: (string | CategoryRef)[];
  sortOrder: number;
  optionValues: AttributeValue[];
}

interface CategoryOption {
  id: string;
  name: string;
}

const yesNo = (value?: boolean) => (value ? 'Yes' : 'No');
const parseYesNo = (value: unknown) => {
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1';
};

const getCategoryNames = (appliesTo?: (string | CategoryRef)[]) => {
  if (!appliesTo?.length) return '';
  return appliesTo
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.name || item?.id || item?._id || '';
    })
    .filter(Boolean)
    .join(', ');
};

export default function AttributesPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('attributes');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);

  const fetchAttributes = useCallback(
    async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/product-attributes?page=${page}&limit=${limit}${searchParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch attributes');
      }
      const data = await response.json();
      return {
        results: data.results || [],
        totalResults: data.totalResults || 0,
        totalPages: data.totalPages || 1,
      };
    },
    []
  );

  const list = useCatalogListState<Attribute>({
    fetchFn: fetchAttributes,
    errorMessage: 'Failed to fetch attributes',
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
        if (!response.ok) return;
        const data = await response.json();
        setAllCategories(
          (data.results || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
        );
      } catch {
        // Non-critical for list display
      }
    };
    loadCategories();
  }, []);

  const resolveCategoryNamesForExport = (appliesTo?: (string | CategoryRef)[]) => {
    if (!appliesTo?.length) return '';
    return appliesTo
      .map((item) => {
        if (typeof item === 'object' && item?.name) return item.name;
        const id = typeof item === 'string' ? item : item?.id || item?._id || '';
        const found = allCategories.find((c) => c.id === id);
        return found?.name || '';
      })
      .filter(Boolean)
      .join(', ');
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/product-attributes?page=1&limit=10000`);
      if (!response.ok) throw new Error('Failed to fetch all attributes for export');
      const data = await response.json();
      const allAttributes = data.results || [];
      const selectedNumericIds = list.selectedIds.map((id) => Number(id));
      const exportSource =
        selectedNumericIds.length > 0
          ? allAttributes.filter((attr: Attribute) => selectedNumericIds.includes(attr.id))
          : allAttributes;
      const exportData = exportSource.map((attr: Attribute) => ({
        ID: attr.id,
        'Attribute Name': attr.name,
        Type: attr.type,
        'Attribute Type': attr.attributeType ?? 'Manufacturing',
        Required: yesNo(attr.required),
        'Applies To Categories': resolveCategoryNamesForExport(attr.appliesToCategory),
        Values: (attr.optionValues || []).map((v) => v.name).join(', '),
        'Sort Order': attr.sortOrder,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
        { wch: 28 }, { wch: 40 }, { wch: 10 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attributes');
      XLSX.writeFile(wb, 'attributes.xlsx');
      toast.success('Attributes exported successfully');
    } catch {
      toast.error('Failed to export attributes');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleAttrs = [
        'Size', 'GSM', 'Fabric Type', 'Colour', 'Pattern', 'Border Type',
        'Hemming Type', 'Embroidery', 'Gender', 'Occasion', 'Season', 'Pack Size',
      ];
      const sampleData = sampleAttrs.map((name, index) => ({
        'Attribute Name': name,
        Type: name === 'GSM' ? 'number' : 'select',
        'Attribute Type': 'Manufacturing',
        Required: index < 4 ? 'Yes' : 'No',
        'Applies To Categories': 'Handkerchief',
        Values: name === 'GSM' ? '' : `${name} Option 1, ${name} Option 2`,
        'Sort Order': index + 1,
      }));
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 24 }, { wch: 40 }, { wch: 10 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attribute Template');
      XLSX.writeFile(wb, 'attribute_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this attribute? This action cannot be undone.')) return;
    const attributeId = Number(id);
    try {
      setIsDeleting(true);
      setDeleteId(attributeId);

      const response = await fetch(`${API_BASE_URL}/product-attributes/${attributeId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete attribute');
      }

      await list.refresh();
      toast.success('Attribute deleted successfully');
    } catch (err) {
      console.error('Error deleting attribute:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete attribute');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      list.setImportProgress(0);
      const reader = new FileReader();

      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

        let categories = allCategories;
        try {
          const catRes = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
          if (catRes.ok) {
            const catData = await catRes.json();
            categories = (catData.results || []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }));
            setAllCategories(categories);
          }
        } catch {
          // use existing
        }

        let allAttrs: Attribute[] = [];
        try {
          const allRes = await fetch(`${API_BASE_URL}/product-attributes?page=1&limit=100000`);
          if (allRes.ok) {
            const allData = await allRes.json();
            allAttrs = allData.results || [];
          }
        } catch {
          allAttrs = list.rows;
        }

        let processed = 0;
        for (const row of jsonData) {
          try {
            const validTypes = ['select', 'radio', 'checkbox', 'text', 'textarea', 'number'];
            const type = String(row['Type'] || 'select').toLowerCase();
            if (!validTypes.includes(type)) {
              throw new Error(`Invalid type: ${row['Type']} for attribute: ${row['Attribute Name']}`);
            }
            const attrType = String(row['Attribute Type'] ?? 'Manufacturing').trim();
            const validAttrTypes = ['Manufacturing', 'Warehouse'];
            const attributeType = validAttrTypes.includes(attrType) ? attrType : 'Manufacturing';
            const categoryNames = String(row['Applies To Categories'] || '')
              .split(',')
              .map((n) => n.trim())
              .filter(Boolean);
            const appliesToCategory = categoryNames
              .map((name) => categories.find((c) => c.name.trim().toLowerCase() === name.toLowerCase())?.id)
              .filter((id): id is string => Boolean(id));

            const valuesStr = String(row['Values'] || '');
            const optionValues = valuesStr
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
              .map((name, index) => ({
                name,
                sortOrder: index,
                image: 'null',
              }));

            const attributeData = {
              name: String(row['Attribute Name'] || ''),
              type,
              attributeType,
              required: parseYesNo(row['Required']),
              appliesToCategory,
              sortOrder: Number(row['Sort Order']) || 0,
              optionValues,
            };

            if (!attributeData.name) throw new Error('Missing attribute name');

            let response;
            const rowId = row['ID'];
            if (rowId) {
              const existingById = allAttrs.find((attr) => String(attr.id) === String(rowId));
              if (existingById) {
                response = await fetch(`${API_BASE_URL}/product-attributes/${rowId}`, {
                  method: 'PATCH',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(attributeData),
                });
                if (!response.ok) {
                  const responseData = await response.json();
                  throw new Error(responseData.message || `Failed to update attribute: ${attributeData.name}`);
                }
                processed++;
                list.setImportProgress(Math.round((processed / jsonData.length) * 100));
                continue;
              }
            }
            const existingByName = allAttrs.find(
              (attr) => attr.name.trim().toLowerCase() === attributeData.name.trim().toLowerCase()
            );
            if (existingByName) {
              response = await fetch(`${API_BASE_URL}/product-attributes/${existingByName.id}`, {
                method: 'PATCH',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(attributeData),
              });
              if (!response.ok) {
                const responseData = await response.json();
                throw new Error(responseData.message || `Failed to update attribute: ${attributeData.name}`);
              }
            } else {
              response = await fetch(`${API_BASE_URL}/product-attributes`, {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(attributeData),
              });
              if (!response.ok) {
                const responseData = await response.json();
                throw new Error(responseData.message || `Failed to create attribute: ${attributeData.name}`);
              }
            }
          } catch (err) {
            console.error('Error importing attribute:', err);
          }
          processed++;
          list.setImportProgress(Math.round((processed / jsonData.length) * 100));
        }
        await list.refresh();
        list.setImportProgress(null);
        toast.success('Import completed');
      };

      reader.onerror = () => {
        list.setImportProgress(null);
        throw new Error('Failed to read file');
      };

      reader.readAsBinaryString(file);
    } catch {
      list.setImportProgress(null);
      toast.error('Failed to process import file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBulkDelete = async () => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete all selected attributes? This action cannot be undone.')) return;
    setIsBulkDeleting(true);
    try {
      for (const id of list.selectedIds) {
        await fetch(`${API_BASE_URL}/product-attributes/${id}`, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
      }
      await list.refresh();
      list.clearSelection();
      toast.success('Selected attributes deleted successfully');
    } catch {
      toast.error('Failed to delete selected attributes');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const dataColumns: UiTableColumn<Attribute>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Attribute Name',
        render: (row) => <span className="font-bold text-gray-900">{row.name}</span>,
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
      {
        key: 'attributeType',
        label: 'Attribute Type',
        render: (row) => (
          <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded tracking-tight bg-gray-100 text-gray-700">
            {row.attributeType ?? 'Manufacturing'}
          </span>
        ),
      },
      {
        key: 'required',
        label: 'Required',
        render: (row) => (
          <span
            className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
              row.required ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {yesNo(row.required)}
          </span>
        ),
      },
      {
        key: 'appliesTo',
        label: 'Applies To',
        render: (row) => getCategoryNames(row.appliesToCategory) || '—',
      },
      {
        key: 'values',
        label: 'Values',
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.optionValues?.map((value, i) => (
              <span key={i} className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700">
                {value.name}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: 'sortOrder',
        label: 'Sort Order',
        render: (row) => row.sortOrder,
      },
    ],
    []
  );

  const columns = buildCatalogTableColumns<Attribute>({
    dataColumns,
    segment: 'attributes',
    basePath: '/catalog/attributes',
    canUpdate,
    canDelete,
    showStatus: false,
    onDelete: handleDelete,
    deleteDisabled: (row) => isDeleting && deleteId === row.id,
    deleteLoading: (row) => isDeleting && deleteId === row.id,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Attributes Master"
        title="Attributes Master"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Attributes Master',
          'Configure handkerchief product attribute dimensions and their allowed values.',
          [
            'Manage attributes such as Size, GSM, Colour, and Pattern',
            'Mark attributes as required and limit them to specific categories',
            'Import or export bulk changes via Excel',
            'Supported types: select, radio, checkbox, text, number',
          ]
        )}
        canImport={canImport}
        fileInputRef={fileInputRef}
        onImportClick={() => fileInputRef.current?.click()}
        onImportChange={handleFileUpload}
        importProgress={list.importProgress}
        onExportTemplate={handleExportTemplate}
        onExport={handleExport}
        canCreate={canCreate}
        addHref="/catalog/attributes/add"
        addLabel="Add Attribute"
        canDelete={canDelete}
        selectedCount={list.selectedIds.length}
        onBulkDelete={handleBulkDelete}
        isLoading={list.isLoading || isBulkDeleting}
        error={list.error}
        rows={list.rows}
        columns={columns}
        rowKey={(row) => String(row.id)}
        selectable={
          canDelete
            ? {
                selectedIds: list.selectedIds,
                selectAll: list.selectAll,
                onSelectAll: list.handleSelectAll,
                onSelect: list.handleSelect,
                getRowId: (row) => String(row.id),
              }
            : undefined
        }
        currentPage={list.currentPage}
        totalPages={list.totalPages}
        totalResults={list.totalResults}
        onPageChange={list.setCurrentPage}
        emptyIcon="ri-list-check"
        emptyAddLabel="Add First Attribute"
      />
    </>
  );
}
