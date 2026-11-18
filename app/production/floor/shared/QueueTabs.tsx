'use client';

import React, { useState } from 'react';

const onClass = 'rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white';
const offClass = 'rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50';

export type QueueTab = 'upcoming' | 'received' | 'completed';

/**
 * Switches a floor between waiting, on-station, and completed/transferred work.
 */
export function QueueTabs({
  upcomingCount,
  receivedCount,
  completedCount = 0,
  upcomingLabel = 'Upcoming',
  receivedLabel = 'Received',
  completedLabel = 'Completed',
  upcoming,
  received,
  completed,
  onTabChange,
}: {
  upcomingCount: number;
  receivedCount: number;
  completedCount?: number;
  upcomingLabel?: string;
  receivedLabel?: string;
  completedLabel?: string;
  upcoming: React.ReactNode;
  received: React.ReactNode;
  completed?: React.ReactNode;
  onTabChange?: (tab: QueueTab) => void;
}) {
  const [tab, setTab] = useState<QueueTab>('upcoming');
  const selectTab = (key: QueueTab) => {
    setTab(key);
    onTabChange?.(key);
  };

  const panels: Record<QueueTab, { id: string; label: string; count: number; body: React.ReactNode }> = {
    upcoming: { id: 'upcoming', label: upcomingLabel, count: upcomingCount, body: upcoming },
    received: { id: 'received', label: receivedLabel, count: receivedCount, body: received },
    completed: {
      id: 'completed',
      label: completedLabel,
      count: completedCount,
      body: completed ?? <EmptyQueue text="Nothing completed on this floor yet." />,
    },
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Floor queue">
        {(Object.keys(panels) as QueueTab[]).map((key) => {
          const panel = panels[key];
          const selected = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`floor-tab-${panel.id}`}
              aria-selected={selected}
              aria-controls={`floor-panel-${panel.id}`}
              className={selected ? onClass : offClass}
              onClick={() => selectTab(key)}
            >
              {panel.label}
              <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] ${selected ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {panel.count}
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`floor-panel-${panels[tab].id}`} aria-labelledby={`floor-tab-${panels[tab].id}`}>
        {panels[tab].body}
      </div>
    </div>
  );
}

/**
 * Empty state for a floor queue tab.
 */
export function EmptyQueue({ text }: { text: string }) {
  return <p className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">{text}</p>;
}