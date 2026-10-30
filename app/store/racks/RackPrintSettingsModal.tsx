'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  DEFAULT_RACK_PRINT_SETTINGS,
  RackPaperSize,
  RackPrintItem,
  RackPrintSettings,
  listQzPrinters,
  printRacks,
  settingsForPaperSize,
  stickersFor50x25,
} from '@/shared/utils/qzRackPrint';

const PAPER_SIZES: RackPaperSize[] = ['4x6', '6x4', '1.96x2.75', '50mm * 70mm', '50mm * 25mm'];
const field = 'w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary';

/**
 * Print settings for rack barcodes. Defaults to one 50mm × 25mm label per barcode.
 */
export function RackPrintSettingsModal({ racks, onClose }: { racks: RackPrintItem[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<RackPrintSettings>(DEFAULT_RACK_PRINT_SETTINGS);
  const [printing, setPrinting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [printer, setPrinter] = useState('');
  const [printerError, setPrinterError] = useState('');

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

  const rowsPerPage = Math.ceil(settings.labelsPerPage / settings.columnsPerRow);
  const labelsPerSheet = rowsPerPage * settings.columnsPerRow;
  const pageCount = Math.ceil(racks.length / labelsPerSheet);

  /**
   * Opens a browser print preview using the same page size as the QZ job.
   */
  const testPrint = () => {
    if (!racks.length) {
      toast.error('No racks available to print');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked! Please allow popups for this site.');
      return;
    }

    const isSmall = settings.paperSize === '50mm * 25mm';
    const isVertical = settings.orientation === 'vertical';
    let paperW = 101.6;
    let paperH = 152.4;
    if (isSmall) {
      const columns = settings.columnsPerRow || 1;
      const rows = Math.ceil(settings.labelsPerPage / columns);
      paperW = 50 * columns;
      paperH = 25 * rows;
    } else if (settings.paperSize === '6x4') {
      paperW = 152.4;
      paperH = 101.6;
    } else if (settings.paperSize === '1.96x2.75' || settings.paperSize === '50mm * 70mm') {
      paperW = 50;
      paperH = 70;
    }

    const labelW = paperW / settings.columnsPerRow;
    const labelH = paperH / (settings.labelsPerPage / settings.columnsPerRow);
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Browser Print - Rack Labels</title>
          <style>
            @page { size: ${paperW}mm ${paperH}mm; margin: 0; }
            body { margin: 0; padding: 0; font-family: sans-serif; -webkit-print-color-adjust: exact; }
            .page { width: ${paperW}mm; height: ${paperH}mm; position: relative; page-break-after: always; overflow: hidden; }
            .label {
              width: ${labelW}mm; height: ${labelH}mm; float: left; box-sizing: border-box;
              padding: 1.5mm; display: flex; justify-content: center; align-items: center; overflow: hidden;
            }
            .content {
              display: flex; flex-direction: column; justify-content: center; align-items: center;
              text-align: center; width: 100%; height: 100%;
              ${isVertical ? `transform: rotate(-90deg); width: ${labelH}mm; height: ${labelW}mm;` : ''}
            }
            .code { font-weight: bold; font-size: ${isSmall ? '16pt' : '26pt'}; margin-bottom: 0; line-height: 1; }
            .details { font-size: ${isSmall ? '10pt' : '18pt'}; margin-bottom: 2mm; white-space: nowrap; font-weight: 500; }
            .barcode { width: 100%; max-height: 45%; display: flex; justify-content: center; align-items: center; }
            svg { width: 90%; height: auto; max-height: 100%; }
          </style>
        </head>
        <body>
    `;

    for (let i = 0; i < racks.length; i += settings.labelsPerPage) {
      html += '<div class="page">';
      for (let j = 0; j < settings.labelsPerPage && i + j < racks.length; j += 1) {
        const rack = racks[i + j];
        html += `
          <div class="label">
            <div class="content">
              <div class="code">${rack.rackCode}</div>
              <div class="details">Shelf: ${rack.shelf || '-'} | Floor: ${rack.floor || '-'}</div>
              <div class="barcode"><svg id="bc-${i + j}"></svg></div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    html += `
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
        <script>
          window.onload = function() {
            const racks = ${JSON.stringify(racks)};
            racks.forEach((rack, idx) => {
              const el = document.getElementById('bc-' + idx);
              if (el) {
                JsBarcode(el, rack.barcode, {
                  format: "CODE128",
                  width: 2,
                  height: ${isSmall ? 40 : 60},
                  displayValue: true,
                  fontSize: ${isSmall ? 10 : 14},
                  margin: 0
                });
              }
            });
            setTimeout(() => { window.print(); window.close(); }, 500);
          };
        <\/script>
      </body></html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  /**
   * Connects QZ Tray if needed and prints one label job for the current list.
   */
  const print = async () => {
    if (!racks.length) {
      toast.error('No racks selected to print');
      return;
    }
    setPrinting(true);
    const layoutInfo = `${rowsPerPage} rows × ${settings.columnsPerRow} column(s)`;
    const toastId = toast.loading(`Printing ${racks.length} rack(s) on ${pageCount} page(s) (${layoutInfo})...`);
    try {
      const result = await printRacks(racks, { customSettings: settings, printerName: printer || undefined });
      if (result.success) {
        toast.success(`Sent ${result.printed} rack barcode(s) to ${result.printer || 'QZ Tray'}`, { id: toastId });
        onClose();
        return;
      }
      toast.error(result.error || 'Failed to print rack barcodes', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Printing error', { id: toastId });
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
        aria-labelledby="rack-print-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl outline-none"
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
          <h3 id="rack-print-title" className="text-sm font-bold text-gray-900">Print Settings - Rack Barcodes</h3>
          <button type="button" className="rounded p-1 text-gray-400 hover:text-gray-600" aria-label="Close print settings" onClick={onClose}>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-[11px] text-gray-500" aria-live="polite">
            {racks.length} rack{racks.length === 1 ? '' : 's'} · {pageCount} page{pageCount === 1 ? '' : 's'} · {rowsPerPage} × {settings.columnsPerRow}
          </p>
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

          <section className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Paper & Orientation</h4>
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold text-gray-700">Paper Size</span>
              <div className="flex flex-wrap gap-2.5">
                {PAPER_SIZES.map((size) => (
                  <label key={size} className="flex cursor-pointer items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 hover:border-primary">
                    <input
                      type="radio"
                      name="paperSize"
                      value={size}
                      checked={settings.paperSize === size}
                      className="h-3.5 w-3.5 text-primary focus:ring-primary"
                      onChange={() => setSettings(settingsForPaperSize(size, settings))}
                    />
                    <span className="ml-1.5 text-xs text-gray-700">{paperSizeLabel(size)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold text-gray-700">Print Orientation</span>
              <div className="flex gap-2.5">
                {(['horizontal', 'vertical'] as const).map((orient) => (
                  <label key={orient} className="flex cursor-pointer items-center rounded border border-gray-200 bg-gray-50 px-3 py-1.5 capitalize hover:border-primary">
                    <input
                      type="radio"
                      name="orientation"
                      value={orient}
                      checked={settings.orientation === orient}
                      className="h-3.5 w-3.5 text-primary focus:ring-primary"
                      onChange={() => setSettings({ ...settings, orientation: orient })}
                    />
                    <span className="ml-2 text-xs font-medium text-gray-700">{orient}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-semibold text-gray-700">
                Top Margin (dots)
                <input
                  type="number"
                  value={settings.firstLabelTopMargin}
                  className={`${field} mt-1`}
                  onChange={(event) => setSettings({ ...settings, firstLabelTopMargin: parseInt(event.target.value, 10) || 0 })}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Layout Settings</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-semibold text-gray-700">
                Columns
                <select
                  value={settings.columnsPerRow}
                  className={`${field} mt-1`}
                  onChange={(event) => setSettings(stickersFor50x25({ ...settings, columnsPerRow: parseInt(event.target.value, 10) }))}
                >
                  {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} Column{count > 1 ? 's' : ''}</option>)}
                </select>
              </label>
              <label className="block text-[11px] font-semibold text-gray-700">
                Labels Per Page
                <select
                  value={settings.labelsPerPage}
                  className={`${field} mt-1`}
                  onChange={(event) => setSettings(stickersFor50x25({ ...settings, labelsPerPage: parseInt(event.target.value, 10) }))}
                >
                  {[1, 2, 3, 4, 6, 8, 10, 12].map((count) => <option key={count} value={count}>{count} Label{count > 1 ? 's' : ''}</option>)}
                </select>
              </label>
            </div>
            <label className="flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.showCutLines}
                className="h-3.5 w-3.5 rounded text-primary focus:ring-primary"
                onChange={(event) => setSettings({ ...settings, showCutLines: event.target.checked })}
              />
              <span className="ml-2 text-[11px] text-gray-600">Show cut lines</span>
            </label>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Font & Barcode Sizes</h4>
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Zone Size" value={settings.zoneFontSize} onChange={(value) => setSettings({ ...settings, zoneFontSize: value || 30 })} />
              <NumberField label="Rack Code Size" value={settings.rackCodeFontSize} onChange={(value) => setSettings({ ...settings, rackCodeFontSize: value || 80 })} />
              <NumberField label="Detail Size" value={settings.detailsFontSize} onChange={(value) => setSettings({ ...settings, detailsFontSize: value || 40 })} />
              <NumberField label="Barcode HT" value={settings.barcodeHeight} onChange={(value) => setSettings({ ...settings, barcodeHeight: value || 80 })} />
              <label className="block text-[11px] font-semibold text-gray-700">
                Barcode WD
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="5"
                  value={settings.barcodeWidth}
                  className={`${field} mt-1`}
                  onChange={(event) => setSettings({ ...settings, barcodeWidth: parseInt(event.target.value, 10) || 2 })}
                />
              </label>
            </div>
            <button
              type="button"
              className="rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
              onClick={() => setSettings(DEFAULT_RACK_PRINT_SETTINGS)}
            >
              <i className="ri-restart-line mr-1.5" aria-hidden />
              Reset Defaults
            </button>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button type="button" className="mr-auto rounded border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100" onClick={testPrint}>
            <i className="ri-window-line mr-1.5" aria-hidden />
            Test Print (Browser)
          </button>
          <button type="button" className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50" disabled={printing || !racks.length} onClick={print}>
            <i className={printing ? 'ri-loader-4-line mr-1.5 animate-spin' : 'ri-printer-line mr-1.5'} aria-hidden />
            Print Rack Barcodes
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Short label for a paper-size radio.
 */
function paperSizeLabel(size: RackPaperSize): string {
  if (size === '4x6') return '4" × 6"';
  if (size === '6x4') return '6" × 4"';
  return size;
}

/**
 * Numeric setting used by the font and barcode height fields.
 */
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-[11px] font-semibold text-gray-700">
      {label}
      <input
        type="number"
        value={value}
        className={`${field} mt-1`}
        onChange={(event) => onChange(parseInt(event.target.value, 10) || 0)}
      />
    </label>
  );
}
