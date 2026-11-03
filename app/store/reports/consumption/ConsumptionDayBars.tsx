import React from 'react';
import { formatDay, formatMetres } from './consumptionFormat';
import { ConsumptionDay } from './consumptionTypes';

/**
 * Issued metres by day. Clicking a bar filters the order list to that day.
 */
export function ConsumptionDayBars({
  days,
  selected,
  onSelect,
}: {
  days: ConsumptionDay[];
  selected: string;
  onSelect: (day: string) => void;
}) {
  const peak = Math.max(1, ...days.map((day) => day.issuedMeters));

  return (
    <section className="rounded-md border border-[#E7E5E4] bg-white p-3" aria-labelledby="consumption-days">
      <h2 id="consumption-days" className="text-sm font-semibold text-[#1C1917]">
        Issued by day
      </h2>
      {days.length === 0 ? (
        <p className="mt-3 text-sm text-[#57534E]">No issues in this range.</p>
      ) : (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Issued metres by day">
          {days.map((day) => {
            const pressed = selected === day.date;
            return (
              <li key={day.date} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={pressed}
                  className={`flex w-[4.5rem] flex-col items-center gap-1 rounded-md border px-1 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)] ${
                    pressed ? 'border-[rgb(132,90,223)] bg-[rgb(132,90,223)]/10' : 'border-transparent hover:border-[#E7E5E4]'
                  }`}
                  onClick={() => onSelect(day.date)}
                >
                  <span className="text-[12px] font-semibold tabular-nums text-[#1C1917]">{formatMetres(day.issuedMeters)}</span>
                  <span
                    className={`w-6 rounded-sm ${pressed ? 'bg-[rgb(132,90,223)]' : 'bg-[#A78BFA]'}`}
                    style={{ height: `${Math.max(8, Math.round((day.issuedMeters / peak) * 72))}px` }}
                    aria-hidden
                  />
                  <span className="text-center text-[12px] font-medium leading-tight text-[#57534E]">{formatDay(day.date)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
