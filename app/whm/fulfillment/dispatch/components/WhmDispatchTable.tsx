'use client';

import React from 'react';
import type { WhmDispatchOrder } from '../mockDispatchOrders';

const th = 'px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200';
const thRight = 'px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200';
const td = 'px-1.5 py-2.5 text-[12px] border border-gray-200';

type Props = {
  rows: WhmDispatchOrder[];
  variant: 'active' | 'shipped';
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (allChecked: boolean) => void;
  allChecked: boolean;
};

export default function WhmDispatchTable({ rows, variant, selected, onToggle, onToggleAll, allChecked }: Props) {
  if (!rows.length) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        {variant === 'active' ? 'No orders waiting for dispatch. Complete billing first.' : 'No shipped orders yet.'}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200 min-w-[800px]">
        <thead>
          <tr className="bg-gray-50/30">
            <th className={`${th} w-10`}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => onToggleAll(allChecked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                aria-label="Select all orders"
              />
            </th>
            <th className={th}>Order #</th>
            <th className={th}>Mother WH ref</th>
            <th className={th}>Destination</th>
            <th className={th}>Stage</th>
            <th className={th}>Challan / vehicle</th>
            {variant === 'shipped' ? (
              <>
                <th className={th}>Dispatched by</th>
                <th className={th}>Dispatch date</th>
              </>
            ) : null}
            <th className={thRight}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order.id} className={`hover:bg-gray-50/50 transition-colors ${selected.has(order.id) ? 'bg-violet-50/40' : ''}`}>
              <td className={td}>
                <input
                  type="checkbox"
                  checked={selected.has(order.id)}
                  onChange={() => onToggle(order.id)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </td>
              <td className={`${td} font-bold text-gray-900`}>{order.orderNumber}</td>
              <td className={`${td} text-gray-700 font-mono text-[10px]`}>{order.motherWhRef}</td>
              <td className={`${td} text-gray-700`}>{order.clientName}</td>
              <td className={td}>
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-800">
                  {order.stage}
                </span>
              </td>
              <td className={`${td} text-gray-600`}>{order.challanVehicle || '—'}</td>
              {variant === 'shipped' ? (
                <>
                  <td className={`${td} text-gray-700`}>{order.dispatchedBy || '—'}</td>
                  <td className={`${td} text-gray-600`}>
                    {order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString() : '—'}
                  </td>
                </>
              ) : null}
              <td className={`${td} text-right whitespace-nowrap`}>
                <button
                  type="button"
                  className="inline-flex items-center px-2 py-1.5 text-[10px] font-semibold rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 mr-1"
                >
                  View
                </button>
                {variant === 'active' ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-2 min-h-[32px] text-[11px] font-semibold rounded bg-violet-600 text-white hover:bg-violet-700"
                  >
                    <i className="ri-truck-line" aria-hidden />
                    Manage
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center px-2 py-1.5 text-[10px] font-semibold rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Flow
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}