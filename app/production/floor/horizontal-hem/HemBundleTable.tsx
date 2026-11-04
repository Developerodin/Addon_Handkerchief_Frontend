import React from 'react';
import { EmptyQueue, QueueTabs } from '../shared/QueueTabs';
import { HemBundle } from './types';

const headClass = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#495057]';
const cellClass = 'border border-gray-200 px-1.5 py-2.5 text-[12px] text-gray-900';

/**
 * Checked bundles waiting for horizontal hemming, and bundles already on a machine.
 */
export function HemBundleTable({
  bundles,
  active,
  onOpen,
}: {
  bundles: HemBundle[];
  active: HemBundle[];
  onOpen: (bundle: HemBundle) => void;
}) {
  return (
    <QueueTabs
      upcomingCount={bundles.length}
      receivedCount={active.length}
      upcoming={(
      <div className="min-h-[300px] overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              {['Bundle', 'Order', 'Qty', 'Rack'].map((label, index) => (
                <th key={label} className={`${headClass} ${index === 0 ? 'pl-[10px]' : ''}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bundles.length ? (
              bundles.map((bundle) => (
                <tr key={bundle.id} className="transition-colors hover:bg-gray-50/50">
                  <td className={`${cellClass} pl-[10px]`}>
                    <button type="button" className="font-mono font-medium text-purple-600 hover:text-purple-700" onClick={() => onOpen(bundle)}>
                      {bundle.barcode}
                    </button>
                  </td>
                  <td className={cellClass}>{bundle.orderNumber || bundle.orderId.slice(-6)}</td>
                  <td className={cellClass}>{bundle.qty}</td>
                  <td className={`${cellClass} pr-[10px]`}>{bundle.rackCode || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border border-gray-200 py-20 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                    <i className="ri-inbox-line text-xl text-gray-200" aria-hidden />
                  </div>
                  <p className="text-xs font-bold text-gray-400">DATA EMPTY</p>
                  <p className="mt-1 text-[11px] text-gray-400">No checked bundle is waiting on a rack.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      received={active.length ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                {['Bundle', 'Order', 'Qty', 'Machine'].map((label) => (
                  <th key={label} className={headClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((bundle) => (
                <tr key={bundle.id} className="transition-colors hover:bg-gray-50/50">
                  <td className={`${cellClass} pl-[10px]`}>
                    <button type="button" className="font-mono font-medium text-purple-600 hover:text-purple-700" onClick={() => onOpen(bundle)}>
                      {bundle.barcode}
                    </button>
                  </td>
                  <td className={cellClass}>{bundle.orderNumber || bundle.orderId.slice(-6)}</td>
                  <td className={cellClass}>{bundle.qty}</td>
                  <td className={cellClass}>{bundle.machineBarcode || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyQueue text="Nothing has been received on this floor yet." />
      )}
    />
  );
}
