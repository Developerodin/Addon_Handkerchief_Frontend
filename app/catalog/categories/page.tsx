"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import { useCatalogListState } from '@/shared/hooks/useCatalogListState';
import CatalogListShell from '@/shared/components/catalog/CatalogListShell';
import { buildCatalogTableColumns, catalogHelpBlock } from '@/shared/components/catalog/catalogListHelpers';
import { UiTableColumn } from '@/shared/components/ui';
import {
  CategoryRecord,
  buildParentMap,
  getCategoryLevel,
  getCategoryPath,
  getLevelLabel,
} from '@/shared/utils/categoryHierarchy';

interface Category extends CategoryRecord {}

const getParentCategoryName = (
  parent: Category['parent'],
  nameMap: Record<string, string> = {}
): string | null => {
  if (!parent) return null;
  if (typeof parent === 'object') return parent.name;
  return nameMap[parent] || null;
};

interface ExcelRow {
  'ID'?: string;
  'Category Name': string;
  'Description'?: string;
  'Parent Category'?: string;
  'Sort Order'?: string | number;
  'Status'?: string;
}

export default function CategoriesPage() {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('categories');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryNameMap, setCategoryNameMap] = useState<Record<string, string>>({});
  const [allCategoriesForHierarchy, setAllCategoriesForHierarchy] = useState<Category[]>([]);

  const fetchCategories = useCallback(
    async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/categories?page=${page}&limit=${limit}${searchParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch categories');
      }
      const data = await response.json();
      return {
        results: Array.isArray(data.results) ? data.results : [],
        totalResults: data.totalResults || 0,
        totalPages: data.totalPages || 1,
      };
    },
    []
  );

  const list = useCatalogListState<Category>({
    fetchFn: fetchCategories,
    errorMessage: 'Failed to fetch categories',
  });

  useEffect(() => {
    const fetchCategoryNames = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
        if (!response.ok) return;
        const data = await response.json();
        const map: Record<string, string> = {};
        (data.results || []).forEach((cat: Category) => {
          map[cat.id] = cat.name;
        });
        setCategoryNameMap(map);
        setAllCategoriesForHierarchy(data.results || []);
      } catch {
        // Non-critical lookup for parent names
      }
    };
    fetchCategoryNames();
  }, []);

  const hierarchyParentMap = useMemo(
    () => buildParentMap(allCategoriesForHierarchy),
    [allCategoriesForHierarchy]
  );

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete category');
      }

      list.setRows((prev) => prev.filter((cat) => cat.id !== id));
      list.setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      toast.success('Category deleted successfully');
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleDeleteSelected = async () => {
    if (!guardDelete() || list.selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.selectedIds.length} selected category(s)?`)) return;
    try {
      let hasError = false;
      const results = await Promise.all(
        list.selectedIds.map(async (id) => {
          try {
            const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
              method: 'DELETE',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to delete category: ${id}`);
            }
            return id;
          } catch (err) {
            hasError = true;
            console.error(`Error deleting category ${id}:`, err);
            return null;
          }
        })
      );
      const successfulDeletes = results.filter((id): id is string => id !== null);
      list.setRows((prev) => prev.filter((cat) => !successfulDeletes.includes(cat.id)));
      list.clearSelection();
      if (hasError) toast.error('Some categories could not be deleted');
      else toast.success('Selected categories deleted successfully');
    } catch (err) {
      console.error('Error in bulk delete:', err);
      toast.error('Failed to delete some categories');
    }
  };

  const handleExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Category Name': 'Handkerchief',
          Description: 'All handkerchief products',
          'Parent Category': 'None',
          'Sort Order': 1,
          Status: 'active',
        },
        {
          'Category Name': 'Embroidery',
          Description: 'Embroidered handkerchief styles',
          'Parent Category': 'Handkerchief',
          'Sort Order': 1,
          Status: 'active',
        },
        {
          'Category Name': 'Plain',
          Description: 'Plain handkerchief styles',
          'Parent Category': 'Handkerchief',
          'Sort Order': 2,
          Status: 'active',
        },
        {
          'Category Name': 'Floral',
          Description: 'Floral embroidery grandchild category',
          'Parent Category': 'Embroidery',
          'Sort Order': 1,
          Status: 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Category Template');
      XLSX.writeFile(wb, 'category_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
      if (!response.ok) throw new Error('Failed to fetch all categories for export');
      const data = await response.json();
      const exportSource = Array.isArray(data.results) ? data.results : [];
      const exportData = exportSource.map((category: Category) => ({
        ID: category.id,
        'Category Name': category.name,
        Description: category.description || '',
        'Parent Category':
          getParentCategoryName(category.parent, categoryNameMap) ||
          exportSource.find((p: Category) => p.id === category.parent)?.name ||
          'None',
        'Sort Order': category.sortOrder,
        Status: category.status,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Categories');
      XLSX.writeFile(wb, `categories_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Categories exported successfully');
    } catch (error) {
      console.error('Error exporting categories:', error);
      toast.error('Failed to export categories');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    list.setImportProgress(0);
    const loadingToast = toast.loading('Importing categories...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = ev.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;
          const allResponse = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
          const allData = allResponse.ok ? await allResponse.json() : { results: [] };
          const allCategories: Category[] = allData.results || [];
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const categoryData = {
                name: row['Category Name'],
                description: row['Description'] || '',
                sortOrder: parseInt(row['Sort Order']?.toString() || '0', 10),
                status: row['Status']?.toString()?.toLowerCase() === 'active' ? 'active' : 'inactive',
                parent: null as string | null,
              };
              const parentName = row['Parent Category'];
              if (parentName && parentName !== 'None') {
                const parentCategory = allCategories.find((c) => c.name === parentName);
                if (parentCategory) categoryData.parent = parentCategory.id;
              }
              let categoryId = row['ID'];
              if (!categoryId) {
                const found = allCategories.find(
                  (c) => c.name.trim().toLowerCase() === categoryData.name.trim().toLowerCase()
                );
                if (found) categoryId = found.id;
              }
              if (categoryId) {
                const patchResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                  method: 'PATCH',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(categoryData),
                });
                if (!patchResponse.ok) throw new Error();
                successCount++;
              } else {
                const postResponse = await fetch(`${API_BASE_URL}/categories`, {
                  method: 'POST',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(categoryData),
                });
                if (!postResponse.ok) throw new Error();
                successCount++;
              }
            } catch {
              errorCount++;
            }
            list.setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          list.setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} categories`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} categories`);
          list.refresh();
        } catch {
          list.setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      list.setImportProgress(null);
      toast.error('Failed to import categories', { id: loadingToast });
    }
  };

  const dataColumns: UiTableColumn<Category>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Category Name',
        render: (row) => <span className="font-bold text-gray-900">{row.name}</span>,
      },
      {
        key: 'level',
        label: 'Level',
        render: (row) => {
          const level = getCategoryLevel(row.id, hierarchyParentMap);
          return (
            <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-tight bg-purple-50 text-purple-700">
              {getLevelLabel(level)}
            </span>
          );
        },
      },
      {
        key: 'path',
        label: 'Path',
        render: (row) => {
          const path = getCategoryPath(row.id, allCategoriesForHierarchy).join(' › ');
          return path || row.name;
        },
      },
      {
        key: 'parent',
        label: 'Parent Category',
        render: (row) => {
          const parentName = getParentCategoryName(row.parent, categoryNameMap);
          if (parentName) {
            return (
              <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700">
                {parentName}
              </span>
            );
          }
          if (row.parent) {
            return (
              <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-400">
                —
              </span>
            );
          }
          return (
            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-gray-100 text-gray-500">
              Root
            </span>
          );
        },
      },
      {
        key: 'sortOrder',
        label: 'Sort Order',
        render: (row) => row.sortOrder,
      },
    ],
    [categoryNameMap, hierarchyParentMap, allCategoriesForHierarchy]
  );

  const columns = buildCatalogTableColumns<Category>({
    dataColumns,
    segment: 'categories',
    basePath: '/catalog/categories',
    canUpdate,
    canDelete,
    onDelete: handleDelete,
  });

  return (
    <>
      <Toaster position="top-right" />
      <CatalogListShell
        seoTitle="Categories"
        title="Categories"
        count={list.totalResults}
        searchQuery={list.searchQuery}
        onSearchChange={list.setSearchQuery}
        itemsPerPage={list.itemsPerPage}
        onItemsPerPageChange={(value) => {
          list.setItemsPerPage(value);
          list.setCurrentPage(1);
        }}
        helpContent={catalogHelpBlock(
          'Categories Management',
          'Manage handkerchief product categories in a 3-level hierarchy: Category → Child → Grandchild.',
          [
            'Browse all product categories with pagination and search',
            'Add, edit, or delete categories at any level',
            'Import or export bulk changes via Excel',
            'Use parent-child relationships: Handkerchief → Embroidery → Floral',
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
        addHref="/catalog/categories/add"
        addLabel="Add Category"
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
        emptyIcon="ri-folder-line"
        emptyAddLabel="Add First Category"
      />
    </>
  );
}
