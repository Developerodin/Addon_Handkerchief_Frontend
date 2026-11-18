'use client';

import React, { useMemo } from 'react';
import { code128Svg } from '@/shared/utils/code128Svg';
import type { FactorySticker } from '@/shared/components/factory/FactoryStickerPreview';

export interface BoxLabelRow {
  barcode: string;
  bundleCount: number;
  pieceQty: number;
  scaleWeight: number;
  orderNumber?: string;
}

export function boxSticker(row: BoxLabelRow): FactorySticker {
  const weightLine = row.scaleWeight > 0 ? `${row.scaleWeight} kg` : 'Weigh on scale';
  const orderLine = row.orderNumber ? `Order ${row.orderNumber}` : '';
  return {
    title: 'Dispatch box',
    lines: [
      orderLine,
      `${row.bundleCount} packing bundle${row.bundleCount === 1 ? '' : 's'} · ${row.pieceQty} pcs`,
      weightLine,
    ].filter(Boolean),
    barcode: row.barcode,
  };
}

/** Dispatch box seal label (barcode + bundles + pieces + weight). */
export function BoxLabel({ row, printing }: { row: BoxLabelRow; printing?: boolean }) {
  const bars = useMemo(
    () => code128Svg(row.barcode, { barHeight: 48, displayWidth: 220, displayHeight: 44 }),
    [row.barcode]
  );
  return (
    <div id={printing ? 'box-label' : undefined} className="rounded border border-gray-200 bg-white p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dispatch box</p>
      {row.orderNumber ? <p className="text-[12px] font-bold text-gray-900">Order {row.orderNumber}</p> : null}
      <p className="text-[12px] text-gray-600">
        {row.bundleCount} packing bundle{row.bundleCount === 1 ? '' : 's'} · {row.pieceQty} pcs
      </p>
      <p className="text-[12px] font-semibold text-gray-800">{row.scaleWeight > 0 ? `${row.scaleWeight} kg` : 'Weigh on scale'}</p>
      <div className="mx-auto mt-2 flex max-w-[220px] justify-center" dangerouslySetInnerHTML={{ __html: bars }} />
      <p className="mt-1 font-mono text-sm font-bold text-gray-900">{row.barcode}</p>
    </div>
  );
}

/** @deprecated Use FactoryStickerPreview + boxSticker */
export function triggerBoxLabelPrint() {
  window.setTimeout(() => window.print(), 0);
}