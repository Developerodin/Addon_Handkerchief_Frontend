'use client';

import React from 'react';
import { formatQty } from '../ReportTable';
import { LiveInventorySummary as Summary } from './liveInventory';

interface LiveInventorySummaryProps {
  summary: Summary | null;
  statusFilter: string;
  onLowStock: () => void;
}

const TILE = 'rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-left';

/**
 * Totals for the current search and status filter.
 */
export function LiveInventorySummary({ summary, statusFilter, onLowStock }: LiveInventorySummaryProps) {
  const value = (meters: number | undefined) => (summary ? `${formatQty(meters || 0)} m` : '—');
  const tiles = [
    { label: 'On rack', value: value(summary?.onRackMeters), hint: 'Stored on a rack' },
    { label: 'QC passed', value: value(summary?.qcPassedMeters), hint: 'Passed, not racked' },
    { label: 'Unallocated', value: value(summary?.unallocatedMeters), hint: 'Received, not stored' },
    { label: 'Issued', value: value(summary?.issuedMeters), hint: 'Issued and on floor' },
    { label: 'Held', value: value(summary?.heldMeters), hint: 'Lot held' },
    { label: 'Available', value: value(summary?.availableMeters), hint: 'On rack + QC passed' },
    { label: 'Fabrics', value: summary ? formatQty(summary.skuCount) : '—', hint: 'Rows in this filter' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Live inventory totals">
      {tiles.map((tile) => (
        <div key={tile.label} className={TILE}>
          <p className="text-[10px] font-bold uppercase text-gray-500">{tile.label}</p>
          <p className="text-sm font-bold text-gray-800">{tile.value}</p>
          <p className="text-[10px] font-medium text-gray-500">{tile.hint}</p>
        </div>
      ))}
      <button
        type="button"
        className={`${TILE} hover:border-amber-400 ${statusFilter === 'Low Stock' ? 'border-amber-500' : ''}`}
        onClick={onLowStock}
        aria-pressed={statusFilter === 'Low Stock'}
        aria-label="Show low stock fabrics"
      >
        <p className="text-[10px] font-bold uppercase text-gray-500">Low stock</p>
        <p className="text-sm font-bold text-amber-700">{summary ? formatQty(summary.lowStockCount) : '—'}</p>
        <p className="text-[10px] font-medium text-gray-500">Below minimum metres</p>
      </button>
    </div>
  );
}
