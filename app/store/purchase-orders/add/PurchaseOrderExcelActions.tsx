'use client';

import React from 'react';

const buttonClass =
  'inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

interface PurchaseOrderExcelActionsProps {
  canImport: boolean;
  canExport: boolean;
  importing: boolean;
  onDownload: () => void;
  onExport: () => void;
  onImport: () => void;
  onAdd: () => void;
  addLabel?: string;
}

/**
 * Template, export, import, and add-line actions for the fabric grid.
 */
export function PurchaseOrderExcelActions({
  canImport,
  canExport,
  importing,
  onDownload,
  onExport,
  onImport,
  onAdd,
  addLabel = 'Add Item',
}: PurchaseOrderExcelActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={buttonClass} onClick={onDownload}>
        <i className="ri-file-excel-2-line text-xs text-green-600" aria-hidden />
        Download Template
      </button>
      <button type="button" className={buttonClass} disabled={!canExport} onClick={onExport}>
        <i className="ri-download-2-line text-xs" aria-hidden />
        Export Excel
      </button>
      <button type="button" className={buttonClass} disabled={!canImport || importing} onClick={onImport}>
        {importing ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        ) : (
          <i className="ri-file-upload-line text-xs" aria-hidden />
        )}
        {importing ? 'Importing...' : 'Import Excel'}
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canImport}
        onClick={onAdd}
      >
        <i className="ri-add-line text-xs" aria-hidden />
        {addLabel}
      </button>
    </div>
  );
}
