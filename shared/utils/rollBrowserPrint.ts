import { code128Svg } from '@/shared/utils/code128Svg';
import { escapeHtml } from '@/shared/utils/printHtmlDocument';

export interface A4Sticker {
  title: string;
  subtitle: string;
  lines?: string[];
  barcode: string;
}

/** Most barcodes that still leave a scannable Code 128 on A4. */
export const A4_MAX_PER_PAGE = 24;

const USABLE_WIDTH_MM = 190;
const USABLE_HEIGHT_MM = 277;
const LABEL_ASPECT = 1.9;

/**
 * Keeps a per-page count inside 1…A4_MAX_PER_PAGE.
 */
export function clampPerPage(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(A4_MAX_PER_PAGE, Math.max(1, Math.floor(value)));
}

/**
 * Columns and rows that fit `perPage` labels on one A4 sheet.
 * Picks the grid whose cell is closest to a wide barcode label.
 */
export function a4Grid(perPage: number): { columns: number; rows: number } {
  const count = clampPerPage(perPage);
  let best = { columns: 1, rows: count, score: Number.POSITIVE_INFINITY };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const aspect = (USABLE_WIDTH_MM / columns) / (USABLE_HEIGHT_MM / rows);
    const waste = columns * rows - count;
    const score = Math.abs(Math.log(aspect / LABEL_ASPECT)) + waste * 0.05;
    if (score < best.score) best = { columns, rows, score };
  }
  return { columns: best.columns, rows: best.rows };
}

/**
 * Type sizes for a sheet with this many rows. Shared by the preview and the print CSS.
 */
export function a4TypeSize(rows: number): { fabricPx: number; metaPx: number; barMm: number } {
  if (rows <= 2) return { fabricPx: 13, metaPx: 11, barMm: 18 };
  if (rows <= 4) return { fabricPx: 11, metaPx: 9, barMm: 12 };
  if (rows <= 6) return { fabricPx: 9, metaPx: 8, barMm: 9 };
  return { fabricPx: 7, metaPx: 6, barMm: 7 };
}

/**
 * Opens the OS print dialog with the chosen barcodes laid out on A4.
 * Does not use QZ Tray.
 */
export function printRollLabelsInBrowser(labels: A4Sticker[], perPage: number): void {
  if (!labels.length) throw new Error('No barcodes to print');
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow popups to print');
  popup.document.open();
  popup.document.write(labelDocument(labels, clampPerPage(perPage)));
  popup.document.close();
}

/**
 * Printable A4 document. One sheet element per page.
 */
function labelDocument(labels: A4Sticker[], perPage: number): string {
  const grid = a4Grid(perPage);
  const type = a4TypeSize(grid.rows);
  const sheets: string[] = [];
  for (let index = 0; index < labels.length; index += perPage) {
    sheets.push(sheetMarkup(labels.slice(index, index + perPage), grid.columns, grid.rows));
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Barcodes</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
html, body { margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; color: #111; }
.sheet { width: 190mm; height: 277mm; display: grid; grid-template-columns: repeat(${grid.columns}, 1fr); grid-template-rows: repeat(${grid.rows}, 1fr); gap: 1.5mm; page-break-after: always; break-after: page; }
.sheet:last-child { page-break-after: auto; break-after: auto; }
.label { display: flex; flex-direction: column; align-items: center; text-align: center; border: 0.3mm dashed #bbb; padding: 1.2mm; overflow: hidden; box-sizing: border-box; }
.fabric { margin: 0; font-size: ${type.fabricPx}px; font-weight: 700; line-height: 1.15; word-break: break-word; }
.line, .code { margin: 1px 0 0; font-size: ${type.metaPx}px; line-height: 1.15; word-break: break-word; }
.code { font-family: ui-monospace, monospace; letter-spacing: 0.03em; }
.bars { width: 100%; flex: 1; min-height: 0; margin-top: auto; }
.bars svg { width: 100%; height: ${type.barMm}mm; display: block; margin: 0 auto; }
</style></head><body>${sheets.join('')}<script>window.print()</script></body></html>`;
}

/**
 * One A4 sheet, including empty cells so the grid matches the preview.
 */
function sheetMarkup(labels: A4Sticker[], columns: number, rows: number): string {
  const slots = Array.from({ length: columns * rows }, (_, index) => (
    labels[index] ? labelMarkup(labels[index]) : '<article class="label"></article>'
  ));
  return `<section class="sheet">${slots.join('')}</section>`;
}

/**
 * One sticker. Text is escaped. The barcode SVG is omitted when the code is not Code 128 set B.
 */
function labelMarkup(label: A4Sticker): string {
  const bars = code128Svg(label.barcode, { barHeight: 70, displayWidth: 320, displayHeight: 48 });
  const lines = [label.subtitle, ...(label.lines || [])].filter(Boolean).map((line) => `<p class="line">${escapeHtml(line)}</p>`).join('');
  return `<article class="label">
<p class="fabric">${escapeHtml(label.title || 'Barcode')}</p>
${lines}
<div class="bars">${bars}</div>
<p class="code">${escapeHtml(label.barcode)}</p>
</article>`;
}
