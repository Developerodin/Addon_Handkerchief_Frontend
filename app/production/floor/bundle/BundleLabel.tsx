import React from 'react';
import { BundleRow } from './types';

/**
 * Bundle barcode label. The page print style shows only the label marked for print.
 */
export function BundleLabel({ bundle, printing }: { bundle: BundleRow; printing: boolean }) {
  return (
    <div id={printing ? 'bundle-label' : undefined} className="rounded border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bundle</p>
      <p className="font-mono text-lg font-bold text-gray-900">{bundle.barcode}</p>
      <p className="text-[12px] text-gray-600">
        {bundle.orderNumber || bundle.orderId.slice(-6)} · {bundle.qty} pcs
      </p>
    </div>
  );
}
