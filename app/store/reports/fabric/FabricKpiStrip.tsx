import React from 'react';
import { formatQty } from '../ReportTable';
import { FabricAnalyticsSummary } from './fabricAnalytics';

interface FabricKpiStripProps {
  summary: FabricAnalyticsSummary | null;
  loading: boolean;
}

/**
 * Glanceable totals for the fabrics matching the current search.
 */
export function FabricKpiStrip({ summary, loading }: FabricKpiStripProps) {
  const meters = (value: number | undefined) => (summary ? `${formatQty(value || 0)} m` : '—');
  const count = (value: number | undefined) => (summary ? formatQty(value || 0) : '—');
  const tiles = [
    { label: 'Inventory', value: meters(summary?.inventoryMeters), hint: 'Still in the store' },
    { label: 'In order', value: meters(summary?.inOrderMeters), hint: 'Open POs still due' },
    { label: 'Draft m', value: meters(summary?.draftMeters), hint: 'Metres on draft POs' },
    { label: 'Draft POs', value: count(summary?.draftPoCount), hint: 'Distinct draft orders' },
    { label: 'Unallocated', value: meters(summary?.unallocatedMeters), hint: 'Received, not stored' },
    { label: 'On rack', value: meters(summary?.onRackMeters), hint: 'Status stored' },
    { label: 'Fabrics', value: count(summary?.fabricCount), hint: 'Rows in this search' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7" aria-label="Fabric analytics totals" aria-busy={loading}>
      {loading && !summary ? (
        <p className="col-span-full text-sm font-medium text-gray-500" role="status">
          Loading fabric analytics
        </p>
      ) : null}
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-md border-2 border-gray-300 bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-gray-500">{tile.label}</p>
          <p className="text-sm font-bold tabular-nums text-gray-800">{tile.value}</p>
          <p className="text-[10px] font-medium text-gray-500">{tile.hint}</p>
        </div>
      ))}
    </div>
  );
}
