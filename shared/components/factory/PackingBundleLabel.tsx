'use client';

import React, { useMemo } from 'react';
import { code128Svg } from '@/shared/utils/code128Svg';
import type { FactorySticker } from '@/shared/components/factory/FactoryStickerPreview';

export interface PackingBundleLabelRow {
  barcode: string;
  orderNumber?: string;
  qty: number;
  scaleWeight: number;
}

/** Builds sticker copy for preview / print. */
export function packingBundleSticker(row: PackingBundleLabelRow): FactorySticker {
  return {
    title: 'Packing bundle',
    subtitle: row.orderNumber || undefined,
    lines: [`${row.qty} pcs · ${row.scaleWeight} kg`],
    barcode: row.barcode,
  };
}

/** Packed-piece bundle label (barcode + piece count + weight). */
export function PackingBundleLabel({ row, printing }: { row: PackingBundleLabelRow; printing?: boolean }) {
  const bars = useMemo(
    () => code128Svg(row.barcode, { barHeight: 48, displayWidth: 220, displayHeight: 44 }),
    [row.barcode]
  );
  return (
    <div id={printing ? 'packing-bundle-label' : undefined} className="rounded border border-gray-200 bg-white p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Packing bundle</p>
      {row.orderNumber ? <p className="text-[12px] text-gray-600">{row.orderNumber}</p> : null}
      <p className="text-[12px] text-gray-600">
        {row.qty} pcs · {row.scaleWeight} kg
      </p>
      <div className="mx-auto mt-2 flex max-w-[220px] justify-center" dangerouslySetInnerHTML={{ __html: bars }} />
      <p className="mt-1 font-mono text-sm font-bold text-gray-900">{row.barcode}</p>
    </div>
  );
}

/** @deprecated Use FactoryStickerPreview + packingBundleSticker */
export function triggerPackingBundleLabelPrint() {
  window.setTimeout(() => window.print(), 0);
}