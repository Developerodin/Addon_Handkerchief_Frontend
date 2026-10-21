'use client';

import React from 'react';

export interface StatItem {
  label: string;
  value: React.ReactNode;
}

/**
 * Count tiles used by the fabric report screens.
 */
export function FabricStatGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Report totals">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border-2 border-gray-300 bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-gray-500">{item.label}</p>
          <p className="text-sm font-bold text-gray-800">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
