'use client';

import React from 'react';

interface TicketConfirmModalProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  variant?: 'default' | 'danger';
  iconClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TicketConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  variant = 'default',
  iconClassName = 'ri-question-line',
  onConfirm,
  onCancel,
}: TicketConfirmModalProps) {
  if (!open) return null;

  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-indigo-600 hover:bg-indigo-700';
  const iconWrapClasses =
    variant === 'danger' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrapClasses}`}>
            <i className={`${iconClassName} text-xl`} aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <div className="mt-2 text-sm text-gray-600">{message}</div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex min-w-[120px] items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${confirmClasses}`}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
