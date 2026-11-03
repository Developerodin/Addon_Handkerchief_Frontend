import React, { useMemo, useState } from 'react';
import { PoOrderRow } from './poAnalyticsTypes';
import { formatDay, formatInr, formatQty } from './poFormat';

type SortKey = 'number' | 'supplier' | 'purchaseDate' | 'status' | 'ordered' | 'received' | 'stillDue' | 'value' | 'days';

const COLUMNS: Array<{ key: SortKey; label: string; align?: 'right' }> = [
  { key: 'number', label: 'Number' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'purchaseDate', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'ordered', label: 'Ordered', align: 'right' },
  { key: 'received', label: 'Received', align: 'right' },
  { key: 'stillDue', label: 'Still due', align: 'right' },
  { key: 'value', label: 'Value', align: 'right' },
  { key: 'days', label: 'Days', align: 'right' },
];

/**
 * Compares two ledger rows for the active column.
 */
function compareRows(left: PoOrderRow, right: PoOrderRow, key: SortKey): number {
  if (key === 'purchaseDate') return String(left.purchaseDate || '').localeCompare(String(right.purchaseDate || ''));
  const a = left[key];
  const b = right[key];
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a || '').localeCompare(String(b || ''));
}

/**
 * Cell text for one column.
 */
function cellText(row: PoOrderRow, key: SortKey): string {
  if (key === 'purchaseDate') return formatDay(row.purchaseDate);
  if (key === 'value') return formatInr(row.value);
  if (key === 'ordered' || key === 'received' || key === 'stillDue' || key === 'days') return formatQty(row[key]);
  return String(row[key] || '—');
}

/**
 * Purchase orders in the current filter. A row opens that order's dossier.
 */
export function PoOrderTable({
  rows,
  selectedId,
  onOpen,
  emptyLabel,
  emptyAction,
}: {
  rows: PoOrderRow[];
  selectedId: string;
  onOpen: (id: string) => void;
  emptyLabel: string;
  emptyAction?: React.ReactNode;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'purchaseDate', dir: 'desc' });
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((left, right) => compareRows(left, right, sort.key) * (sort.dir === 'asc' ? 1 : -1));
    return copy;
  }, [rows, sort]);

  /**
   * Flips the column, or switches to it.
   */
  function toggleSort(key: SortKey) {
    setSort((current) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[#E7E5E4] bg-white">
      <table className="w-full min-w-[760px] border-collapse">
        <caption className="px-3 py-2 text-left text-sm font-semibold text-[#1C1917]">Purchase orders</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col" aria-sort={sort.key === column.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-2 py-2">
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
              const selected = row.id === selectedId;
              return (
                <tr key={row.id} className={selected ? 'bg-[rgb(132,90,223)]/10' : undefined}>
                  {COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className={`border-t border-[#E7E5E4] px-2 py-1.5 text-sm tabular-nums ${
                        column.align === 'right' ? 'text-right' : 'text-left'
                      } ${
                        column.key === 'received'
                          ? 'text-[#166534]'
                          : column.key === 'stillDue' && row.stillDue > 0
                            ? 'text-[#9A3412]'
                            : 'text-[#1C1917]'
                      }`}
                    >
                      {column.key === 'number' ? (
                        <button
                          type="button"
                          aria-pressed={selected}
                          className="font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]"
                          onClick={() => onOpen(row.id)}
                        >
                          {row.number}
                        </button>
                      ) : (
                        cellText(row, column.key)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
