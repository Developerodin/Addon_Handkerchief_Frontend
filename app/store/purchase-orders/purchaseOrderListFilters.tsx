'use client';

import React from 'react';
import { UiButton } from '@/shared/components/ui';

const PO_STATUSES = [
  'Submitted to Vendor',
  'In Transit',
  'Received',
  'Partially Received',
  'Return to Vendor',
  'Completed',
  'Rejected',
];

/**
 * Local calendar date as YYYY-MM-DD.
 */
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Default order-date window: the last 30 days through today.
 */
export function defaultPoDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

/**
 * Status filter and Excel download, sitting with the page-size and new-order controls.
 */
export function PurchaseOrderToolbarActions({
  status,
  onStatusChange,
  onDownload,
  downloading,
  downloadDisabled,
  downloadLabel = 'Download Excel',
}: {
  status: string;
  onStatusChange: (status: string) => void;
  onDownload: () => void;
  downloading: boolean;
  downloadDisabled: boolean;
  downloadLabel?: string;
}) {
  return (
    <>
      <div className="catalog-page-size-wrap">
        <select
          aria-label="Status"
          className="catalog-page-size-select !min-w-[9.5rem]"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">All statuses</option>
          {PO_STATUSES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <i className="ri-arrow-down-s-line catalog-page-size-select__icon" aria-hidden />
      </div>
      <UiButton
        type="button"
        variant="success"
        icon="ri-file-excel-2-line"
        onClick={onDownload}
        disabled={downloadDisabled || downloading}
        loading={downloading}
        aria-label={downloading ? 'Preparing Excel download' : downloadLabel}
      >
        {downloading ? 'Preparing…' : downloadLabel}
      </UiButton>
    </>
  );
}

/**
 * Date range on the right, directly above the table, matching the purchase-order reference.
 */
export function PurchaseOrderDateBar({
  from,
  to,
  onFromChange,
  onToChange,
  onReset,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-2">
      <span className="border-b-2 border-blue-500 px-3 py-2 text-[11px] font-bold text-gray-800">All</span>
      <div className="flex items-center gap-3 pr-2">
        <div className="flex items-center gap-1.5 rounded border border-dashed border-gray-200 bg-gray-50/50 px-2 py-1">
          <i className="ri-calendar-line text-[10px] text-gray-400" aria-hidden />
          <input
            aria-label="From"
            type="date"
            className="w-24 cursor-pointer border-none bg-transparent p-0 text-[10px] font-bold text-gray-600 outline-none"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
          />
          <span className="text-[10px] text-gray-300" aria-hidden>
            ~
          </span>
          <input
            aria-label="To"
            type="date"
            className="w-24 cursor-pointer border-none bg-transparent p-0 text-[10px] font-bold text-gray-600 outline-none"
            value={to}
            onChange={(event) => onToChange(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="text-[9px] font-bold uppercase text-purple-400 transition-colors hover:text-purple-600"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
