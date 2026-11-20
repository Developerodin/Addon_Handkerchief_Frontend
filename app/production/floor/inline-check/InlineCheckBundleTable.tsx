import React from 'react';
import { CompletedQueueTable, CompletedRow } from '../shared/CompletedQueueTable';

/**
 * Logged inline checks only (bundles are opened by barcode scan, not listed here).
 */
export function InlineCheckCompletedPanel({ completed = [] }: { completed?: CompletedRow[] }) {
  return (
    <div className="min-h-[200px]">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Completed</p>
      <CompletedQueueTable rows={completed} emptyText="No inline checking logged in the last two weeks." />
    </div>
  );
}