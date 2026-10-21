'use client';

import React from 'react';
import { VendorReturnRow } from '@/shared/services/factoryApi';
import { downloadHtmlDocument, printHtmlDocument } from '@/shared/utils/printHtmlDocument';
import { challanBody } from './challanDocument';

export interface ChallanDrawerProps {
  row: VendorReturnRow;
  onClose: () => void;
}

/**
 * Return challan detail, print, and download.
 */
export function ChallanDrawer({ row, onClose }: ChallanDrawerProps) {
  const title = row.challanNumber || 'Return challan';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl" aria-label="Return challan">
        <header className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          <button type="button" className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Close challan" onClick={onClose}>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>
        <div className="space-y-2 p-4 text-xs text-gray-700">
          <p>PO {row.poNumber || row.poId}</p>
          <p>Supplier {row.supplierName || '—'}</p>
          <p>Reason {row.reason}</p>
          <p>Lots {(row.lotNumbers || []).join(', ') || '—'}</p>
          <p>Remarks {row.remarks || '—'}</p>
          <p>Quantity {row.quantity ?? row.rollBarcodes.length} · Weight {row.weight ?? 0}</p>
          <ul className="space-y-1">
            {row.rollBarcodes.map((code) => (
              <li key={code} className="rounded border border-gray-200 px-2 py-1 font-mono">{code}</li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <button type="button" className="rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white" onClick={() => printHtmlDocument(title, challanBody(row))}>
              Print
            </button>
            <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-[11px] font-bold text-gray-700" onClick={() => downloadHtmlDocument(`${title}.html`, title, challanBody(row))}>
              Download
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
