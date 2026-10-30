'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { listQzPrinters } from '@/shared/utils/qzRackPrint';
import {
  DEFAULT_ROLL_PRINT_SETTINGS,
  printRollLabels,
  RollLabel,
  RollPrintSettings,
} from '@/shared/utils/qzRollPrint';
import { openRollLabelPreview } from './rollLabelPreview';

const field = 'w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary';

type JsBarcodeFn = (element: SVGSVGElement, value: string, options: Record<string, unknown>) => void;

/**
 * Loads JsBarcode once so the settings dialog can draw the sticker.
 */
function loadJsBarcode(): Promise<JsBarcodeFn> {
  const host = window as Window & { JsBarcode?: JsBarcodeFn };
  if (host.JsBarcode) return Promise.resolve(host.JsBarcode);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    script.onload = () => {
      if (host.JsBarcode) resolve(host.JsBarcode);
      else reject(new Error('Barcode preview did not load'));
    };
    script.onerror = () => reject(new Error('Barcode preview did not load'));
    document.head.appendChild(script);
  });
}

/**
 * Roll print settings with a live 100×100 mm preview. Rack settings are not used.
 */
export function RollPrintSettingsModal({
  labels,
  onClose,
}: {
  labels: RollLabel[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [settings, setSettings] = useState<RollPrintSettings>(DEFAULT_ROLL_PRINT_SETTINGS);
  const [index, setIndex] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [printer, setPrinter] = useState('');
  const [printerError, setPrinterError] = useState('');
  const label = labels[Math.min(index, Math.max(0, labels.length - 1))];

  useEffect(() => {
    dialogRef.current?.focus();
    let cancelled = false;
    listQzPrinters()
      .then((found) => {
        if (cancelled) return;
        setPrinters(found.printers);
        setPrinter(found.defaultPrinter);
      })
      .catch((error) => {
        if (!cancelled) setPrinterError(error instanceof Error ? error.message : 'Could not reach QZ Tray');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = barcodeRef.current;
    if (!node || !label?.barcode) return;
    let cancelled = false;
    loadJsBarcode()
      .then((draw) => {
        if (cancelled || !barcodeRef.current) return;
        draw(barcodeRef.current, label.barcode, {
          format: 'CODE128',
          width: settings.barcodeWidth,
          height: Math.max(1, Math.round(settings.barcodeHeight * 0.28)),
          displayValue: true,
          fontSize: 11,
          margin: 0,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [label?.barcode, settings.barcodeWidth, settings.barcodeHeight]);

  /**
   * Sends the chosen rolls with the sizes shown in this dialog.
   */
  const print = async () => {
    setPrinting(true);
    const toastId = toast.loading(`Printing ${labels.length} roll barcode${labels.length === 1 ? '' : 's'}...`);
    try {
      await printRollLabels(printer, labels, settings);
      toast.success(`Sent ${labels.length} roll barcode${labels.length === 1 ? '' : 's'} to ${printer || 'QZ Tray'}`, { id: toastId });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not print barcodes', { id: toastId });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roll-print-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl outline-none"
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
          <h3 id="roll-print-title" className="text-sm font-bold text-gray-900">Print Settings - Roll Barcodes</h3>
          <button type="button" className="rounded p-1 text-gray-400 hover:text-gray-600" aria-label="Close print settings" onClick={onClose}>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <p className="text-[11px] text-gray-500">{labels.length} roll{labels.length === 1 ? '' : 's'} · 100 mm × 100 mm</p>
            <label className="block text-[11px] font-semibold text-gray-700">
              QZ Tray printer
              <select
                value={printer}
                className={`${field} mt-1`}
                aria-label="QZ Tray printer"
                disabled={!printers.length}
                onChange={(event) => setPrinter(event.target.value)}
              >
                {printers.length ? printers.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">Connecting…</option>}
              </select>
            </label>
            {printerError ? <p className="text-[11px] text-red-600" role="alert">{printerError}</p> : null}

            <section className="space-y-3 border-t border-gray-100 pt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Label</h4>
              <p className="text-xs text-gray-600">100 mm × 100 mm. One roll per sticker.</p>
            </section>

            <section className="space-y-3 border-t border-gray-100 pt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Font & Barcode Sizes</h4>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Field name" value={settings.nameFontSize} fallback={28} onChange={(value) => setSettings({ ...settings, nameFontSize: value })} />
                <NumberField label="Value size" value={settings.valueFontSize} fallback={30} onChange={(value) => setSettings({ ...settings, valueFontSize: value })} />
                <NumberField label="Barcode HT" value={settings.barcodeHeight} fallback={160} onChange={(value) => setSettings({ ...settings, barcodeHeight: value })} />
                <NumberField label="Barcode WD" value={settings.barcodeWidth} fallback={3} min={1} max={5} onChange={(value) => setSettings({ ...settings, barcodeWidth: value })} />
              </div>
              <button
                type="button"
                className="rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                onClick={() => setSettings(DEFAULT_ROLL_PRINT_SETTINGS)}
              >
                <i className="ri-restart-line mr-1.5" aria-hidden />
                Reset Defaults
              </button>
            </section>
          </div>

          <aside className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Preview</h4>
              {labels.length > 1 ? (
                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                  <button type="button" className="rounded border border-gray-200 px-1.5 py-0.5 disabled:opacity-40" disabled={index === 0} aria-label="Previous label" onClick={() => setIndex((current) => Math.max(0, current - 1))}>‹</button>
                  <span>{index + 1} / {labels.length}</span>
                  <button type="button" className="rounded border border-gray-200 px-1.5 py-0.5 disabled:opacity-40" disabled={index >= labels.length - 1} aria-label="Next label" onClick={() => setIndex((current) => Math.min(labels.length - 1, current + 1))}>›</button>
                </div>
              ) : null}
            </div>
            {label ? <LabelPreview label={label} settings={settings} barcodeRef={barcodeRef} /> : null}
          </aside>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button
            type="button"
            className="mr-auto rounded border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
            onClick={() => {
              try {
                openRollLabelPreview(labels, settings);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Could not open the preview');
              }
            }}
          >
            <i className="ri-window-line mr-1.5" aria-hidden />
            Browser preview
          </button>
          <button type="button" className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50" disabled={printing || !labels.length} onClick={print}>
            <i className={printing ? 'ri-loader-4-line mr-1.5 animate-spin' : 'ri-printer-line mr-1.5'} aria-hidden />
            Print roll barcodes
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Scaled sticker: barcode on top, full lines, then Sort no./Type and Count/Color.
 */
function LabelPreview({
  label,
  settings,
  barcodeRef,
}: {
  label: RollLabel;
  settings: RollPrintSettings;
  barcodeRef: React.RefObject<SVGSVGElement>;
}) {
  const namePx = Math.max(8, Math.round(settings.nameFontSize * 0.45));
  const valuePx = Math.max(10, Math.round(settings.valueFontSize * 0.45));
  const before: Array<[string, string | undefined, boolean]> = [
    ['Roll id', label.rollCode, false],
    ['Fabric name', label.fabricName, true],
    ['Supplier', label.supplierName, false],
    ['PO No', label.poNumber, false],
    ['Lot no', label.lotNumber, false],
  ];
  const pairs: Array<[string, string | undefined]> = [
    ['Sort no.', label.sortNo],
    ['Type', label.fabricType],
    ['Count', label.countName],
    ['Color', label.colourName],
  ];
  const line = (title: string, value: string | undefined, wrap: boolean) => (
    <div key={title} className="flex items-start gap-1" style={{ minHeight: wrap ? valuePx * 2.4 : undefined }}>
      <span className="shrink-0 text-gray-500" style={{ fontSize: namePx, lineHeight: 1.2 }}>{title}</span>
      <span
        className={wrap ? 'line-clamp-2 min-w-0 font-semibold text-gray-900' : 'min-w-0 truncate font-semibold text-gray-900'}
        style={{ fontSize: valuePx, lineHeight: 1.2 }}
      >
        {value || '—'}
      </span>
    </div>
  );

  return (
    <div className="aspect-square w-full overflow-hidden rounded border border-dashed border-gray-300 bg-white px-2 pb-2 shadow-inner" style={{ paddingTop: '6%' }} aria-label="Roll label preview">
      <div className="flex justify-center" style={{ marginBottom: '4%' }}>
        <svg ref={barcodeRef} role="img" aria-label={`Barcode ${label.barcode}`} />
      </div>
      <div className="mb-1 space-y-0.5">
        {before.map(([title, value, wrap]) => line(title, value, wrap))}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {pairs.map(([title, value]) => (
          <div key={title}>
            <div className="text-gray-500" style={{ fontSize: namePx, lineHeight: 1.1 }}>{title}</div>
            <div className="truncate font-semibold text-gray-900" style={{ fontSize: valuePx, lineHeight: 1.15 }}>{value || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Numeric setting. An empty box stays empty while typing and falls back only when it loses focus.
 */
function NumberField({
  label,
  value,
  fallback,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  fallback: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (parsed: number) => {
    let next = parsed;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return next;
  };

  return (
    <label className="block text-[11px] font-semibold text-gray-700">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={draft}
        className={`${field} mt-1`}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = parseInt(event.target.value, 10);
          if (parsed > 0) onChange(clamp(parsed));
        }}
        onBlur={() => {
          const parsed = parseInt(draft, 10);
          const next = parsed > 0 ? clamp(parsed) : fallback;
          onChange(next);
          setDraft(String(next));
        }}
      />
    </label>
  );
}
