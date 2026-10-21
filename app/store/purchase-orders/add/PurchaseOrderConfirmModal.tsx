'use client';

import React, { useEffect, useRef } from 'react';

export type PoConfirmMode = 'draft' | 'raise' | 'update';

interface PurchaseOrderConfirmModalProps {
  mode: PoConfirmMode | null;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const COPY: Record<PoConfirmMode, { title: string; message: string; confirm: string }> = {
  draft: {
    title: 'Save draft?',
    message: 'This purchase order will be saved as a draft. Nothing is sent to the supplier until you submit it.',
    confirm: 'Save draft',
  },
  raise: {
    title: 'Submit to supplier?',
    message: 'This purchase order will be sent to the supplier.',
    confirm: 'Submit to Supplier',
  },
  update: {
    title: 'Save changes?',
    message: 'This updates the purchase order.',
    confirm: 'Save',
  },
};

/**
 * Confirm or close before a draft save or a supplier submit.
 */
export function PurchaseOrderConfirmModal({ mode, saving, onConfirm, onClose }: PurchaseOrderConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode) dialogRef.current?.focus();
  }, [mode]);

  if (!mode) return null;

  const copy = COPY[mode];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="po-confirm-title"
        aria-describedby="po-confirm-message"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-xl outline-none"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !saving) onClose();
        }}
      >
        <h2 id="po-confirm-title" className="text-base font-bold text-gray-900">
          {copy.title}
        </h2>
        <p id="po-confirm-message" className="mt-2 text-sm text-gray-600">
          {copy.message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <i className="ri-loader-4-line animate-spin text-sm" aria-hidden /> : null}
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
