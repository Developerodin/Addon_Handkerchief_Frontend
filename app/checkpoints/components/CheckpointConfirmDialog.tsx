'use client';

import React, { useEffect, useId } from 'react';

interface CheckpointConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  pendingLabel?: string;
  pending: boolean;
  tone?: 'primary' | 'danger';
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirm before deleting a module or a checkpoint, or before a sign-off switch changes.
 */
export default function CheckpointConfirmDialog({
  title,
  message,
  confirmLabel,
  pendingLabel = 'Saving…',
  pending,
  tone = 'danger',
  onClose,
  onConfirm,
}: CheckpointConfirmDialogProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/40 p-4" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 disabled:opacity-60 ${
              tone === 'primary'
                ? 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500'
                : 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
            }`}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
