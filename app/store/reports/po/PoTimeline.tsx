import React from 'react';
import { PoDossier } from './poAnalyticsTypes';
import { formatDay, formatDays, formatWhen } from './poFormat';
import { Section } from './poUi';

/**
 * How long this order has taken, step by step.
 */
export function PoTimeline({ dossier }: { dossier: PoDossier }) {
  const { cycle, timeline } = dossier;
  const summary = [
    cycle.daysToFirstReceipt != null ? `First receipt ${formatDays(cycle.daysToFirstReceipt)} after the order.` : 'No receipt yet.',
    cycle.daysOpen != null ? `Still open, ${formatDays(cycle.daysOpen)} since the order.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Section title="Time on this order">
      <p className="px-3 pb-2 text-sm text-[#57534E]">{summary}</p>
      {timeline.length === 0 ? <p className="px-3 pb-3 text-sm text-[#57534E]">No dates recorded.</p> : null}
      <ol className="grid gap-3 px-3 pb-3">
        {timeline.map((event, index) => (
          <li key={`${event.at}-${event.label}-${index}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <span className="text-[13px] font-medium text-[#57534E]">
              {index === 0 ? 'Start' : formatDays(event.daysAfterPrevious)}
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#1C1917]">{event.label}</span>
              <span className="block text-[13px] text-[#57534E]">{event.dateOnly ? formatDay(event.at) : formatWhen(event.at)}</span>
              {event.detail ? <span className="block text-[13px] text-[#57534E]">{event.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
