import React from 'react';

export interface SupplierKpi {
  label: string;
  value: string;
  hint: string;
}

interface SupplierKpiStripProps {
  items: SupplierKpi[];
  loading: boolean;
  label: string;
}

/**
 * Glanceable supplier totals. Hints say what the number is counting.
 */
export function SupplierKpiStrip({ items, loading, label }: SupplierKpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label={label} aria-busy={loading}>
      {loading && !items.length ? (
        <p className="col-span-full text-sm font-medium text-gray-500" role="status">
          Loading suppliers
        </p>
      ) : null}
      {items.map((item) => (
        <div key={item.label} className="rounded-md border-2 border-gray-300 bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-gray-500">{item.label}</p>
          <p className="text-sm font-bold tabular-nums text-gray-800">{item.value}</p>
          <p className="text-[10px] font-medium text-gray-500">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}
