import React from 'react';
import { formatQty } from '../ReportTable';
import { formatMeters } from './supplierFormat';
import { SupplierRow } from './supplierTypes';

interface SupplierTableProps {
  rows: SupplierRow[];
  selected: string;
  emptyLabel: string;
  onOpen: (supplierName: string) => void;
}

/**
 * Metres, with the roll count under them. Rejected rolls often have no metres stored.
 * @param meters - QC metres
 * @param rolls - QC rolls
 */
function qcLabel(meters: number, rolls: number): string {
  return `${formatMeters(meters)} · ${formatQty(rolls)} rolls`;
}

/**
 * Fabric types already capped by the API, shown under the fabric count.
 * @param row - One supplier on the list
 */
function fabricLabel(row: SupplierRow): string {
  const types = row.fabricTypes.filter(Boolean).join(', ');
  return types ? `${formatQty(row.fabricCount)} · ${types}` : formatQty(row.fabricCount);
}

const COLUMNS = [
  { key: 'supplier', label: 'Supplier', align: 'left' },
  { key: 'city', label: 'City', align: 'left' },
  { key: 'orders', label: 'POs', align: 'right' },
  { key: 'current', label: 'Current', align: 'right' },
  { key: 'fabrics', label: 'Fabrics', align: 'left' },
  { key: 'ordered', label: 'Ordered', align: 'right' },
  { key: 'received', label: 'Received', align: 'right' },
  { key: 'pass', label: 'QC pass', align: 'right' },
  { key: 'fail', label: 'QC fail', align: 'right' },
  { key: 'returned', label: 'Returned', align: 'right' },
];

/**
 * Suppliers ranked by quantity purchased. A row opens that mill's dossier.
 */
export function SupplierTable({ rows, selected, emptyLabel, onOpen }: SupplierTableProps) {
  const head = 'px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200';
  const cell = 'px-2 py-2 text-sm text-gray-800 border-b border-gray-100';

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="w-full min-w-[960px] border-collapse">
        <caption className="px-3 py-2 text-left text-sm font-bold text-gray-800">Suppliers</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col" className={`${head} ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={`${cell} text-gray-500`} colSpan={COLUMNS.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const open = selected === row.supplierName;
              return (
                <tr
                  key={row.supplierName}
                  className={`cursor-pointer ${open ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                  aria-selected={open}
                  onClick={() => onOpen(row.supplierName)}
                >
                  <td className={cell}>
                    <button
                      type="button"
                      className="text-left font-semibold text-[rgb(132,90,223)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]"
                      aria-pressed={open}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(row.supplierName);
                      }}
                    >
                      {row.supplierName}
                    </button>
                  </td>
                  <td className={cell}>{row.city || '—'}</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatQty(row.orders)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatQty(row.currentOrders)}</td>
                  <td className={cell}>{fabricLabel(row)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatQty(row.orderedQty)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatQty(row.receivedQty)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{qcLabel(row.qcPassedMeters, row.qcPassedRolls)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{qcLabel(row.qcFailedMeters, row.qcFailedRolls)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatQty(row.returnQty)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
