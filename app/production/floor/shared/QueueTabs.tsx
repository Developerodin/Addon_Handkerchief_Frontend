'use client';

import React, { useState } from 'react';

const onClass = 'rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white';
const offClass = 'rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50';

/**
 * Switches a floor between work still on a rack and work already received here.
 */
export function QueueTabs({
  upcomingCount,
  receivedCount,
  upcoming,
  received,
}: {
  upcomingCount: number;
  receivedCount: number;
  upcoming: React.ReactNode;
  received: React.ReactNode;
}) {
  const [tab, setTab] = useState<'upcoming' | 'received'>('upcoming');
  const upcomingOn = tab === 'upcoming';

  return (
    <div>
      <div className="mb-3 flex gap-2" role="tablist" aria-label="Floor queue">
        <button type="button" role="tab" id="floor-tab-upcoming" aria-selected={upcomingOn} aria-controls="floor-panel-upcoming" className={upcomingOn ? onClass : offClass} onClick={() => setTab('upcoming')}>
          Upcoming
          <span className="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">{upcomingCount}</span>
        </button>
        <button type="button" role="tab" id="floor-tab-received" aria-selected={!upcomingOn} aria-controls="floor-panel-received" className={upcomingOn ? offClass : onClass} onClick={() => setTab('received')}>
          Received
          <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{receivedCount}</span>
        </button>
      </div>
      <div role="tabpanel" id={upcomingOn ? 'floor-panel-upcoming' : 'floor-panel-received'} aria-labelledby={upcomingOn ? 'floor-tab-upcoming' : 'floor-tab-received'}>
        {upcomingOn ? upcoming : received}
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
