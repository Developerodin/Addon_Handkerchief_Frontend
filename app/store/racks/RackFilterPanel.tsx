'use client';

import React from 'react';

export interface RackFilterPanelProps {
  fabric: string;
  occupancy: string;
  section: string;
  sections: string[];
  onFabricChange: (value: string) => void;
  onOccupancyChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onClose: () => void;
}

const OCCUPANCY = [
  { id: '', label: 'All', icon: 'ri-layout-grid-line' },
  { id: 'empty', label: 'Empty', icon: 'ri-checkbox-blank-line' },
  { id: 'occupied', label: 'Occupied', icon: 'ri-archive-line' },
];

/**
 * Inline rack filters: fabric on the stored rolls, occupancy, and section.
 */
export function RackFilterPanel({
  fabric,
  occupancy,
  section,
  sections,
  onFabricChange,
  onOccupancyChange,
  onSectionChange,
  onClose,
}: RackFilterPanelProps) {
  const active = Boolean(fabric.trim() || occupancy || section);
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" aria-label="Filter racks">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <i className="ri-filter-3-line" aria-hidden />
          </span>
          Filter racks
        </h3>
        <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700" aria-label="Close filters" onClick={onClose}>
          <i className="ri-close-line text-lg" aria-hidden />
        </button>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Fabric name</span>
          <span className="relative block">
            <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={fabric}
              placeholder="Substring match on rolls"
              aria-label="Fabric name"
              className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(event) => onFabricChange(event.target.value)}
            />
          </span>
        </label>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Occupancy</p>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Occupancy">
            {OCCUPANCY.map((option) => (
              <button
                key={option.id || 'all'}
                type="button"
                aria-pressed={occupancy === option.id}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold ${occupancy === option.id ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600'}`}
                onClick={() => onOccupancyChange(option.id)}
              >
                <i className={option.icon} aria-hidden />
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Section</span>
          <select
            aria-label="Section"
            value={section}
            className="w-full rounded-md border border-gray-200 px-2 py-2 text-xs"
            onChange={(event) => onSectionChange(event.target.value)}
          >
            <option value="">All sections</option>
            {sections.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-3 text-[11px] text-gray-500">Matches fabric name on rolls stored on the rack. Occupancy and section narrow the grid below.</p>
      <p className="mt-1 text-[11px] text-gray-400">{active ? 'Filters are applied to the rack grid.' : 'No filters applied — the grid below shows every active rack.'}</p>
    </section>
  );
}
