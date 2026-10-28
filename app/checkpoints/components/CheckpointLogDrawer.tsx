'use client';

import React, { useEffect, useId, useState } from 'react';
import checkpointService from '@/shared/services/checkpointService';
import type { CheckpointItem, CheckpointLog } from '@/shared/types/checkpoint';
import { formatSignoffTime, logAction } from '../checkpointAccess';

interface CheckpointLogDrawerProps {
  item: CheckpointItem;
  onClose: () => void;
}

/**
 * Side panel listing who flipped a checkpoint switch, and when.
 */
export default function CheckpointLogDrawer({ item, onClose }: CheckpointLogDrawerProps) {
  const titleId = useId();
  const [logs, setLogs] = useState<CheckpointLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    checkpointService
      .listLogs(item.id)
      .then((rows) => {
        if (active) setLogs(rows);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load the log');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [item.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-gray-900/30" role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sign-off log</p>
            <h2 id={titleId} className="mt-1 text-base font-semibold text-gray-900">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close sign-off log"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? <p className="text-sm text-gray-500">Loading log…</p> : null}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error && logs.length === 0 ? (
            <p className="text-sm text-gray-500">No one has changed this checkpoint yet.</p>
          ) : null}
          <ol className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="rounded-lg border border-gray-200 px-3 py-2">
                <p className="text-sm font-medium text-gray-900">
                  {log.userName} {logAction(log.column, log.checked)}
                </p>
                <p className="mt-1 text-xs text-gray-500">{formatSignoffTime(log.actedAt)}</p>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
