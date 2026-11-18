'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { code128Svg } from '@/shared/utils/code128Svg';
import { printRollLabelsInBrowser, type A4Sticker } from '@/shared/utils/rollBrowserPrint';

export interface FactorySticker {
  title: string;
  subtitle?: string;
  lines?: string[];
  barcode: string;
}

/**
 * On-screen sticker preview + browser print (CODE128), same layout as roll A4 barcodes.
 */
export function FactoryStickerPreview({
  open,
  sticker,
  onClose,
}: {
  open: boolean;
  sticker: FactorySticker | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  const bars = useMemo(
    () => (sticker?.barcode ? code128Svg(sticker.barcode, { barHeight: 56, displayWidth: 280, displayHeight: 56 }) : ''),
    [sticker?.barcode]
  );

  if (!open || !sticker) return null;

  const printDoc: A4Sticker = {
    title: sticker.title,
    subtitle: sticker.subtitle || '',
    lines: sticker.lines,
    barcode: sticker.barcode,
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4 print:hidden"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sticker-preview-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-xl outline-none"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 id="sticker-preview-title" className="text-sm font-bold text-gray-900">
            Label preview
          </h2>
          <button type="button" className="text-gray-500 hover:text-gray-800" aria-label="Close preview" onClick={onClose}>
            ×
          </button>
        </div>
        <article className="flex flex-col items-center rounded border border-dashed border-gray-300 bg-white p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{sticker.title}</p>
          {sticker.subtitle ? <p className="mt-1 text-[12px] text-gray-700">{sticker.subtitle}</p> : null}
          {sticker.lines?.map((line) => (
            <p key={line} className="mt-0.5 text-[12px] text-gray-600">
              {line}
            </p>
          ))}
          <div className="mt-3 flex w-full max-w-[280px] justify-center" dangerouslySetInnerHTML={{ __html: bars }} />
          <p className="mt-2 font-mono text-sm font-bold tracking-wide text-gray-900">{sticker.barcode}</p>
        </article>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-purple-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-purple-700"
            onClick={() => {
              try {
                printRollLabelsInBrowser([printDoc], 1);
              } catch {
                window.print();
              }
            }}
          >
            Print
          </button>
          <button type="button" className="rounded border border-gray-200 px-4 py-2 text-[11px] font-bold text-gray-700" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}