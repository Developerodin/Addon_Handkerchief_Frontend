import React from 'react';
import { PoSupplierBar } from './poAnalyticsTypes';
import { formatQty } from './poFormat';

/**
 * Ordered quantity by supplier. Choosing a bar filters the ledger.
 */
export function PoSupplierBars({
  rows,
  ready,
  selected,
  onSelect,
}: {
  rows: PoSupplierBar[];
  ready: boolean;
  selected: string;
  onSelect: (supplier: string) => void;
}) {
  if (!ready) return null;
  const peak = Math.max(1, ...rows.map((row) => row.ordered));

  return (
    <section className="rounded-md border border-[#E7E5E4] bg-white p-3" aria-label="Ordered quantity by supplier">
      <h2 className="text-sm font-semibold text-[#1C1917]">From whom</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-[#57534E]">No suppliers in this range.</p> : null}
      <ul className="mt-2 grid gap-1">
        {rows.map((row) => {
          const active = selected === row.supplier;
          return (
            <li key={row.supplier}>
              <button
                type="button"
                aria-pressed={active}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)] ${
                  active ? 'bg-[rgb(132,90,223)]/10' : 'hover:bg-[#F4F1EC]'
                }`}
                onClick={() => onSelect(active ? '' : row.supplier)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#1C1917]">{row.supplier}</span>
                  <span className="mt-1 block h-2 overflow-hidden rounded-sm bg-[#E7E5E4]" aria-hidden>
                    <span
                      className="block h-full rounded-sm bg-[rgb(132,90,223)]"
                      style={{ width: `${Math.max(4, Math.round((row.ordered / peak) * 100))}%` }}
                    />
                  </span>
                </span>
                <span className="text-right text-[13px] font-medium tabular-nums text-[#57534E]">
                  <span className="block text-sm font-semibold text-[#1C1917]">{formatQty(row.ordered)}</span>
                  {row.orders} {row.orders === 1 ? 'order' : 'orders'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
