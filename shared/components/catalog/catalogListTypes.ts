import type React from 'react';
import type { CatalogSegment } from '@/shared/hooks/useCatalogCrud';
import type { FabricLookupStatus } from '@/shared/services/fabricLookupService';

export type CatalogListApi<T> = {
  list: (params: { page?: number; limit?: number; search?: string; category?: string }) => Promise<{
    results: T[];
    totalPages: number;
    totalResults: number;
  }>;
  create: (payload: Partial<T>) => Promise<T>;
  update: (id: string, payload: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

export interface CatalogListColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sticky?: 'right';
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number;
  cellClassName?: string;
}

export interface CatalogListConfig<T extends { id: string; name?: string; status?: FabricLookupStatus | string }> {
  segment: CatalogSegment;
  title: string;
  description: string;
  basePath: string;
  api: CatalogListApi<T>;
  columns: CatalogListColumn<T>[];
  showNameColumn?: boolean;
  showStatusColumn?: boolean;
  selectable?: boolean;
  replicate?: boolean;
  onReplicate?: (row: T) => void | Promise<void>;
  importTemplateRow: Record<string, string | number>;
  importTemplateRows?: Record<string, string | number>[];
  mapImportRow: (row: Record<string, unknown>, existing?: T) => Partial<T>;
  findExisting?: (rows: T[], importRow: Record<string, unknown>) => T | undefined;
  mapExportRow?: (row: T) => Record<string, string | number>;
  emptyIcon?: string;
  helpContent?: React.ReactNode;
  getRowName?: (row: T) => string;
}
