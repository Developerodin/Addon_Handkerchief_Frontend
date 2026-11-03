import React from 'react';
import { PoTotals } from './poAnalyticsTypes';
import { formatDays, formatInr, formatQty } from './poFormat';

/**
 * Glanceable totals for the current filter.
 */
export function PoKpiStrip({ totals, loading }: { totals: PoTotals | null; loading: boolean }) {
  const items = [
    { label: 'Orders', value: totals ? formatQty(totals.orders) : '—' },
    { label: 'Suppliers', value: totals ? formatQty(totals.suppliers) : '—' },
    { label: 'Ordered', value: totals ? formatQty(totals.orderedQty) : '—' },
    { label: 'Received', value: totals ? formatQty(totals.receivedQty) : '—', tone: 'text-[#166534]' },
    { label: 'Still due', value: totals ? formatQty(totals.stillDue) : '—', tone: 'text-[#9A3412]' },
    { label: 'Value', value: totals ? formatInr(totals.value) : '—' },
    { label: 'With GST', value: totals ? formatInr(totals.valueWithGst) : '—' },
    { label: 'Open', value: totals ? formatQty(totals.openOrders) : '—' },
    { label: 'Days to receipt', value: totals ? formatDays(totals.medianDaysToReceipt) : '—' },
  ];

  return (
    <div aria-busy={loading}>
      {loading && !totals ? (
        <p className="text-sm font-medium text-[#57534E]" role="status">
          Loading purchase orders
        </p>
      ) : null}
      {totals ? <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" aria-label="Purchase order totals">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2">
            <dt className="text-[13px] font-medium text-[#57534E]">{item.label}</dt>
            <dd className={`text-xl font-semibold tabular-nums ${item.tone || 'text-[#1C1917]'}`}>{item.value}</dd>
          </div>
        ))}
      </dl> : null}
    </div>
  );
}
