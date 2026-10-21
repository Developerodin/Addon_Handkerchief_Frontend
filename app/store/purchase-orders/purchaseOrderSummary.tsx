import React from 'react';
import { PurchaseOrderLine, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { formatInr } from './add/purchaseOrderFormModel';

/**
 * Ordered quantity grouped by measurement unit.
 */
function quantityByUnit(lines: PurchaseOrderLine[]): Array<[string, number]> {
  const groups = new Map<string, number>();
  lines.forEach((line) => {
    const unit = line.unitName || '';
    groups.set(unit, (groups.get(unit) || 0) + (line.quantity || 0));
  });
  return [...groups.entries()];
}

/**
 * Compact quantity for summary lines.
 */
function formatMeasure(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

/**
 * Summary cell. `amount` matches the PO received list: total, received, ordered, pending.
 */
export function PurchaseOrderSummary({ order, variant = 'rate' }: { order: PurchaseOrderRow; variant?: 'rate' | 'amount' }) {
  const lines = order.lines || [];
  const ordered = quantityByUnit(lines);
  const unit = ordered.length === 1 ? ordered[0][0] : '';
  const orderedQty = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  if (variant === 'amount') {
    const total = lines.reduce((sum, line) => sum + (line.quantity || 0) * (line.rate || 0), 0);
    const received = order.goodsReceivedQuantity || 0;
    const pending = Math.max(0, orderedQty - received);
    const suffix = unit ? ` ${unit}` : '';
    return (
      <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
        <span className="text-xs font-bold text-gray-800">{formatInr(total)}</span>
        {received > 0 ? <span className="font-medium text-gray-500">Rec: {formatMeasure(received)}{suffix}</span> : null}
        <span className="font-medium text-gray-500">Ord: {formatMeasure(orderedQty)}{suffix}</span>
        {pending > 0 ? <span className="font-medium text-orange-600">Pending: {formatMeasure(pending)}{suffix}</span> : null}
      </div>
    );
  }
  const total = lines.reduce((sum, line) => {
    const sub = (line.quantity || 0) * (line.rate || 0);
    return sum + sub + (sub * (line.gstPercent || 0)) / 100;
  }, 0);
  const received = order.goodsReceivedQuantity || 0;
  const pending = Math.max(0, orderedQty - received);
  const suffix = unit ? ` ${unit}` : '';
  return (
    <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
      <span className="text-xs font-bold text-gray-800">{formatInr(total)}</span>
      <span className="font-medium text-gray-500">Rec: {formatMeasure(received)}{suffix}</span>
      <span className="font-medium text-gray-500">Ord: {formatMeasure(orderedQty)}{suffix}</span>
      {pending > 0 ? <span className="font-medium text-orange-600">Pending: {formatMeasure(pending)}{suffix}</span> : null}
    </div>
  );
}
