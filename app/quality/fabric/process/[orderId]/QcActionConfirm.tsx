'use client';

import React, { useEffect, useRef } from 'react';
import { RollRow } from '@/shared/services/factoryApi';

export type QcPendingAction =
  | { kind: 'pass-roll' | 'reject-roll'; roll: RollRow }
  | { kind: 'pass-lot' | 'reject-lot' | 'hold-lot'; lotNumber: string; remarks: string };

interface QcActionConfirmProps {
  action: QcPendingAction | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

interface ConfirmCopy {
  title: string;
  message: string;
  confirm: string;
  confirmClass: string;
}

/**
 * Copy and button color for one QC confirmation.
 */
function confirmCopy(action: QcPendingAction): ConfirmCopy {
  if (action.kind === 'pass-roll' || action.kind === 'reject-roll') {
    const name = action.roll.rollCode || action.roll.barcode;
    if (action.kind === 'pass-roll') {
      return {
        title: 'Pass this roll?',
        message: `${name} will be marked QC accepted. The lot stays pending until you pass, reject, or hold the lot.`,
        confirm: 'Pass roll',
        confirmClass: 'bg-green-600 hover:bg-green-700',
      };
    }
    return {
      title: 'Reject this roll?',
      message: `${name} will be marked QC rejected. The lot stays pending until you pass, reject, or hold the lot.`,
      confirm: 'Reject roll',
      confirmClass: 'bg-red-600 hover:bg-red-700',
    };
  }
  if (action.kind === 'pass-lot') {
    return {
      title: `Pass lot ${action.lotNumber}?`,
      message: 'Every roll on this lot that is not already rejected will be QC accepted, and the lot will be marked QC accepted.',
      confirm: 'Pass lot',
      confirmClass: 'bg-green-600 hover:bg-green-700',
    };
  }
  if (action.kind === 'reject-lot') {
    return {
      title: `Reject lot ${action.lotNumber}?`,
      message: 'Every roll on this lot that is not already passed will be QC rejected, and the lot will be marked QC rejected.',
      confirm: 'Reject lot',
      confirmClass: 'bg-red-600 hover:bg-red-700',
    };
  }
  return {
    title: `Hold lot ${action.lotNumber}?`,
    message: 'This lot will be held. Roll statuses stay as they are.',
    confirm: 'Hold lot',
    confirmClass: 'bg-orange-500 hover:bg-orange-600',
  };
}

/**
 * Asks before a roll or lot QC action. Focus stays in the dialog until it closes.
 */
export function QcActionConfirm({ action, busy, onConfirm, onClose }: QcActionConfirmProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (action) dialogRef.current?.focus();
  }, [action]);

  if (!action) return null;

  const copy = confirmCopy(action);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qc-confirm-title"
        aria-describedby="qc-confirm-message"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-xl outline-none"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose();
        }}
      >
        <h2 id="qc-confirm-title" className="text-base font-bold text-gray-900">{copy.title}</h2>
        <p id="qc-confirm-message" className="mt-2 text-sm text-gray-600">{copy.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${copy.confirmClass}`}
          >
            {busy ? <i className="ri-loader-4-line animate-spin text-sm" aria-hidden /> : null}
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
