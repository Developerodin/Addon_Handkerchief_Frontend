import React, { useMemo, useState } from 'react';
import { bandLabel, formatMetres, formatVariance, varianceClass } from './consumptionFormat';
import { ConsumptionOrder } from './consumptionTypes';

type SortKey = 'orderNumber' | 'fabricName' | 'bomMeters' | 'issuedMeters' | 'returnedMeters' | 'consumedMeters' | 'varianceMeters';

const COLUMNS: Array<{ key: SortKey; label: string; align?: 'right' }> = [
  { key: 'orderNumber', label: 'Order' },
  { key: 'fabricName', label: 'Fabric' },
  { key: 'bomMeters', label: 'BOM', align: 'right' },
  { key: 'issuedMeters', label: 'Issued', align: 'right' },
  { key: 'returnedMeters', label: 'Returned', align: 'right' },
  { key: 'consumedMeters', label: 'Consumed', align: 'right' },
  { key: 'varianceMeters', label: 'Variance', align: 'right' },
];

/**
 * Compares two order rows for the active column.
 * @param left - First row
 * @param right - Second row
 * @param key - Active column
 */
function compareRows(left: ConsumptionOrder, right: ConsumptionOrder, key: SortKey): number {
  const a = left[key];
  const b = right[key];
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a || '').localeCompare(String(b || ''));
}

/**
 * Orders issued against the BOM. A row opens that order.
 */
export function ConsumptionOrderTable({
  rows,
  selectedId,
  onOpen,
  emptyLabel,
  emptyAction,
}: {
  rows: ConsumptionOrder[];
  selectedId: string;
  onOpen: (orderId: string) => void;
  emptyLabel: string;
  emptyAction?: React.ReactNode;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'varianceMeters', dir: 'desc' });
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((left, right) => compareRows(left, right, sort.key) * (sort.dir === 'asc' ? 1 : -1));
    return copy;
  }, [rows, sort]);

  /**
   * Flips the column, or switches to it starting with the largest quantity.
   * @param key - Column to sort
   */
  function toggleSort(key: SortKey) {
    const starting = key === 'orderNumber' || key === 'fabricName' ? 'asc' : 'desc';
    setSort((current) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: starting }));
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[#E7E5E4] bg-white">
      <table className="w-full min-w-[760px] border-collapse">
        <caption className="px-3 py-2 text-left text-sm font-semibold text-[#1C1917]">Metres issued vs BOM</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort.key === column.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                className="px-2 py-2"
              >
                <button
                  type="button"
                  className={`text-[13px] font-semibold text-[#57534E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)] ${
                    column.align === 'right' ? 'ml-auto block' : ''
                  }`}
                  onClick={() => toggleSort(column.key)}
                >
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-sm text-[#57534E]" colSpan={COLUMNS.length}>
                <p>{emptyLabel}</p>
                {emptyAction}
              </td>
            </tr>
          ) : (
            sorted.map((row) => {
              const selected = row.orderId === selectedId;
              return (
                <tr key={`${row.orderId}-${row.fabricName}`} className={selected ? 'bg-[rgb(132,90,223)]/10' : undefined}>
                  <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-left text-sm">
                    <button
                      type="button"
                      aria-pressed={selected}
                      className="font-semibold text-[#1C1917] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]"
                      onClick={() => onOpen(row.orderId)}
                    >
                      {row.orderNumber || 'Unnumbered'}
                    </button>
                  </td>
                  <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-sm text-[#1C1917]">
                    <span>{row.fabricName}</span>
                    {row.missingBom ? (
                      <span className="ml-2 rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[11px] font-semibold text-[#92400E]">No BOM</span>
                    ) : null}
                  </td>
                  <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-right text-sm tabular-nums text-[#1C1917]">
                    {formatMetres(row.bomMeters)}
                  </td>
                  <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-right text-sm tabular-nums text-[#1C1917]">
                    {formatMetres(row.issuedMeters)}
                  </td>
                  <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-right text-sm tabular-nums text-[#57534E]">
                    {formatMetres(row.returnedMeters)}
                  </td>
                  <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-right text-sm tabular-nums text-[#1C1917]">
                    {formatMetres(row.consumedMeters)}
                  </td>
                  <td className={`border-t border-[#E7E5E4] px-2 py-1.5 text-right text-sm font-semibold tabular-nums ${varianceClass(row.band)}`}>
                    {formatVariance(row.varianceMeters)}
                    <span className="mt-0.5 block text-[11px] font-medium">{bandLabel(row.band)}</span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
