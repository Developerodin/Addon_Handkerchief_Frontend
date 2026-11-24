'use client';

import React, { useEffect } from 'react';
import { formatUnits, type WhmRequisitionRow } from '../mockRequisitions';

type Props = {
  open: boolean;
  rows: WhmRequisitionRow[];
  onClose: () => void;
  onUpdateOrder: () => void;
};

export default function WhmRequisitionCreateOrderModal({ open, rows, onClose, onUpdateOrder }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whm-req-order-modal-title"
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <div>
            <h2 id="whm-req-order-modal-title" className="text-sm font-bold text-gray-900">
              Create trim / packaging order
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">{rows.length} material line(s) selected</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        <div className="px-4 py-3 max-h-[50vh] overflow-y-auto">
          <p className="text-[11px] text-gray-600 mb-3">
            Review quantities. Click <strong>Update order</strong> to set draft PO qty and mark lines as order created.
          </p>
          <table className="w-full text-[11px] border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-left font-bold text-gray-600 border-b border-gray-200">Material / trim</th>
                <th className="px-2 py-2 text-right font-bold text-gray-600 border-b border-gray-200 w-24">Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-2 py-2 font-semibold text-gray-900">{r.materialName}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-bold text-gray-800">{formatUnits(r.qty)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="px-2 py-2 font-bold text-gray-700">Total qty (all lines)</td>
                <td className="px-2 py-2 text-right font-bold text-purple-700 tabular-nums">{formatUnits(totalQty)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 bg-gray-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-[11px] font-bold text-gray-600 border border-gray-200 rounded bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onUpdateOrder}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm"
          >
            <i className="ri-check-double-line" aria-hidden />
            Update order
          </button>
        </div>
      </div>
    </div>
  );
}