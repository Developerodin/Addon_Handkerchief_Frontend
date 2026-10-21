'use client';

import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { UnallocatedRolls } from './UnallocatedRolls';
import { AllocatedRolls } from './AllocatedRolls';
import { RackLayout } from './RackLayout';
import { RollTracker } from './RollTracker';

type StorageTab = 'unallocated' | 'allocated' | 'racks' | 'tracker';

const TABS: Array<{ id: StorageTab; label: string }> = [
  { id: 'unallocated', label: 'Unallocated rolls' },
  { id: 'allocated', label: 'Allocated rolls' },
  { id: 'racks', label: 'Rolls storage' },
  { id: 'tracker', label: 'Roll tracker' },
];

/**
 * Fabric storage. QC-passed rolls start unallocated, then move onto a rack.
 */
export default function FabricStoragePage() {
  const [tab, setTab] = useState<StorageTab>('unallocated');

  return (
    <RequireCrudPermission path="Fabric / Storage" action="read">
      <Toaster position="top-right" />
      <div className="main-content !px-4 !py-4 sm:!px-6 sm:!py-5">
        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <header className="mb-4 flex items-center gap-2">
            <span className="h-5 w-[3px] rounded bg-primary" aria-hidden />
            <h1 className="text-sm font-bold text-gray-800">Fabric storage</h1>
          </header>
          <div className="mb-4 flex flex-wrap border-b border-gray-100" role="tablist" aria-label="Fabric storage">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`relative px-3 py-2 text-[11px] font-bold ${tab === item.id ? 'text-primary' : 'text-gray-600'}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                {tab === item.id ? <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" /> : null}
              </button>
            ))}
          </div>
          {tab === 'unallocated' ? <UnallocatedRolls /> : null}
          {tab === 'allocated' ? <AllocatedRolls /> : null}
          {tab === 'racks' ? <RackLayout /> : null}
          {tab === 'tracker' ? <RollTracker /> : null}
        </div>
      </div>
    </RequireCrudPermission>
  );
}
