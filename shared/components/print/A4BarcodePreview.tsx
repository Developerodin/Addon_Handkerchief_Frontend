'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { code128Svg } from '@/shared/utils/code128Svg';
import { A4_MAX_PER_PAGE, A4Sticker, a4Grid, a4TypeSize, clampPerPage, printRollLabelsInBrowser } from '@/shared/utils/rollBrowserPrint';

const PRESETS = [1, 2, 4, 6, 8, 12];

export interface A4PreviewLabel extends A4Sticker {
  id: string;
  name: string;
  detail: string;
}

/**
 * A4 preview. The operator picks which barcodes and how many sit on each sheet, then prints.
 */
export function A4BarcodePreview({ labels, onClose }: { labels: A4PreviewLabel[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(labels.map((label) => label.id)));
  const [perPage, setPerPage] = useState(() => clampPerPage(Math.min(labels.length || 1, 8)));

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const chosen = useMemo(() => labels.filter((label) => selected.has(label.id)), [labels, selected]);
  const grid = a4Grid(perPage);
  const type = a4TypeSize(grid.rows);
  const sheets = useMemo(() => chunk(chosen, perPage), [chosen, perPage]);
  const allOn = labels.length > 0 && chosen.length === labels.length;

  /**
   * Sends the current selection to the system print dialog.
   */
  const print = () => {
    try {
      printRollLabelsInBrowser(chosen, perPage);
      toast.success(`${chosen.length} barcode${chosen.length === 1 ? '' : 's'} on ${sheets.length} A4 sheet${sheets.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not print barcodes');
    }
  };

  /**
   * Toggles one roll, or every roll when the id is omitted.
   */
  const toggle = (id?: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (!id) {
        if (next.size === labels.length) next.clear();
        else labels.forEach((label) => next.add(label.id));
        return next;
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="a4-preview-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl outline-none"
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="a4-preview-title" className="text-base font-bold text-gray-900">Print barcodes on A4</h2>
            <p className="mt-1 text-xs text-gray-500">Choose which barcodes and how many fit on each A4 sheet. Extra barcodes continue on the next sheet.</p>
          </div>
          <button type="button" className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="Close A4 preview" onClick={onClose}>
            <i className="ri-close-line" aria-hidden />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-5 md:grid-cols-[240px_1fr]">
          <div className="flex min-h-0 flex-col gap-3">
            <fieldset className="space-y-2">
              <legend className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Barcodes per A4</legend>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={perPage === count}
                    className={`rounded border px-2 py-1 text-[11px] font-bold ${perPage === count ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700'}`}
                    onClick={() => setPerPage(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <label className="block text-[11px] font-semibold text-gray-700" htmlFor="a4-per-page">Custom count</label>
              <input
                id="a4-per-page"
                type="number"
                min={1}
                max={A4_MAX_PER_PAGE}
                inputMode="numeric"
                aria-label="Barcodes per A4 sheet"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                value={perPage}
                onChange={(event) => setPerPage(clampPerPage(Number(event.target.value)))}
              />
              <p className="text-[11px] text-gray-500" aria-live="polite">
                {grid.columns} × {grid.rows} on each sheet. {chosen.length} selected, {sheets.length} sheet{sheets.length === 1 ? '' : 's'}.
              </p>
            </fieldset>
            <div className="min-h-0 flex-1 overflow-y-auto rounded border border-gray-200">
              <label className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                <input type="checkbox" checked={allOn} onChange={() => toggle()} aria-label="Select all barcodes" />
                Select all
              </label>
              <ul className="divide-y divide-gray-100">
                {labels.map((label) => (
                  <li key={label.id}>
                    <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-xs text-gray-800">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selected.has(label.id)}
                        aria-label={`Include ${label.name}`}
                        onChange={() => toggle(label.id)}
                      />
                      <span>
                        <span className="block font-semibold">{label.name}</span>
                        <span className="block font-mono text-[10px] text-gray-500">{label.detail}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto rounded bg-gray-100 p-4" aria-label="A4 preview">
            {sheets.length ? sheets.map((page, pageIndex) => (
              <SheetPreview key={`${page[0]?.id || 'empty'}-${pageIndex}`} page={page} pageIndex={pageIndex} pageCount={sheets.length} columns={grid.columns} rows={grid.rows} fabricPx={type.fabricPx} metaPx={type.metaPx} />
            )) : <p className="text-sm text-gray-500">Select at least one barcode.</p>}
          </div>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button type="button" className="rounded border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700" onClick={onClose}>Cancel</button>
          <button type="button" className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={!chosen.length} onClick={print}>
            <i className="ri-printer-line" aria-hidden />
            Print A4
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * One scaled A4 page in the preview.
 */
function SheetPreview({
  page,
  pageIndex,
  pageCount,
  columns,
  rows,
  fabricPx,
  metaPx,
}: {
  page: A4PreviewLabel[];
  pageIndex: number;
  pageCount: number;
  columns: number;
  rows: number;
  fabricPx: number;
  metaPx: number;
}) {
  const slots = Array.from({ length: columns * rows }, (_, index) => page[index] || null);
  return (
    <figure className="mx-auto mb-4 w-full max-w-[280px]">
      <figcaption className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Sheet {pageIndex + 1} of {pageCount}
      </figcaption>
      <div
        className="grid bg-white p-2 shadow-sm"
        style={{ aspectRatio: '210 / 297', gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 3 }}
      >
        {slots.map((label, index) => (
          <div key={label?.id || `empty-${pageIndex}-${index}`} className="min-h-0 overflow-hidden border border-dashed border-gray-300 p-0.5">
            {label ? <LabelFace label={label} fabricPx={Math.max(6, fabricPx - 4)} metaPx={Math.max(5, metaPx - 3)} /> : null}
          </div>
        ))}
      </div>
    </figure>
  );
}

/**
 * Title, subtitle, Code 128, and the barcode text inside one preview cell.
 */
function LabelFace({ label, fabricPx, metaPx }: { label: A4PreviewLabel; fabricPx: number; metaPx: number }) {
  const bars = code128Svg(label.barcode, { barHeight: 48, displayWidth: 160, displayHeight: 28 });
  const lines = [label.subtitle, ...(label.lines || [])].filter(Boolean);
  return (
    <div className="flex h-full flex-col text-center">
      <p className="break-words font-bold leading-tight text-gray-900" style={{ fontSize: fabricPx }}>{label.title || 'Barcode'}</p>
      {lines.map((line, index) => (
        <p key={`${label.id}-${index}`} className="break-words leading-tight text-gray-700" style={{ fontSize: metaPx }}>{line}</p>
      ))}
      <div className="mt-auto min-h-0 flex-1 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: bars }} />
      <p className="break-all font-mono leading-tight text-gray-800" style={{ fontSize: metaPx }}>{label.barcode}</p>
    </div>
  );
}

/**
 * Splits labels into pages of `size`.
 */
function chunk(labels: A4PreviewLabel[], size: number): A4PreviewLabel[][] {
  const pages: A4PreviewLabel[][] = [];
  for (let index = 0; index < labels.length; index += size) pages.push(labels.slice(index, index + size));
  return pages;
}
