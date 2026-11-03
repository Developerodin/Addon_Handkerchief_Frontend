import React from 'react';
import { PoWeekBar } from './poAnalyticsTypes';
import { formatDay, formatQty } from './poFormat';

/**
 * How many orders landed in each week of the current filter.
 */
export function PoWeekStrip({ weeks }: { weeks: PoWeekBar[] }) {
  const peak = Math.max(1, ...weeks.map((week) => week.orders));
  if (!weeks.length) return null;

  return (
    <section className="rounded-md border border-[#E7E5E4] bg-white p-3" aria-label="Orders by week">
      <h2 className="text-sm font-semibold text-[#1C1917]">Orders by week</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {weeks.map((week) => (
          <li key={week.week} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <span className="text-[13px] font-semibold tabular-nums text-[#1C1917]">{week.orders}</span>
            <span
              className="w-6 rounded-sm bg-[rgb(132,90,223)]"
              style={{ height: `${Math.max(8, Math.round((week.orders / peak) * 72))}px` }}
              aria-hidden
            />
            <span className="text-center text-[13px] font-medium leading-tight text-[#57534E]">
              {formatDay(week.week)}
              <span className="block">{formatQty(week.ordered)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
