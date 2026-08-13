'use client';

import React from 'react';
import type { TaskStatus } from '@/shared/types/helpSupportTasks';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

interface TaskStatusConfirmModalProps {
  open: boolean;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TaskStatusConfirmModal({
  open,
  fromStatus,
  toStatus,
  busy = false,
  onConfirm,
  onCancel,
}: TaskStatusConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <i className="ri-refresh-line text-xl" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">Update task status?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Change status from{' '}
              <span className="font-semibold text-gray-900">{STATUS_LABELS[fromStatus]}</span> to{' '}
              <span className="font-semibold text-indigo-700">{STATUS_LABELS[toStatus]}</span>?
            </p>
            <p className="mt-2 text-xs text-gray-500">
              After updating, you can add a comment in the timeline below.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex min-w-[120px] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Updating…' : 'Update status'}
          </button>
        </div>
      </div>
    </div>
  );
}
