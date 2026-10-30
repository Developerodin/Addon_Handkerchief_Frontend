import { DEFAULT_ROLL_PRINT_SETTINGS, RollLabel, RollPrintSettings } from '@/shared/utils/qzRollPrint';

/**
 * Escapes text placed into the preview page.
 */
function escapeHtml(value: string | undefined): string {
  return String(value || '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * One field: name above the value, no border.
 */
function cell(title: string, value: string | undefined): string {
  return `<div class="cell"><div class="name">${escapeHtml(title)}</div><div class="value">${escapeHtml(value)}</div></div>`;
}

/**
 * Field name and value on one full-width line.
 */
function fullLine(title: string, value: string | undefined): string {
  return `<div class="line"><div class="name">${escapeHtml(title)}</div><div class="value">${escapeHtml(value)}</div></div>`;
}

/**
 * Opens a 100×100 mm browser preview. It does not send a job to QZ Tray.
 */
export function openRollLabelPreview(
  labels: RollLabel[],
  settings: RollPrintSettings = DEFAULT_ROLL_PRINT_SETTINGS,
): void {
  if (!labels.length) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups for this site to preview labels.');
  }

  const pages = labels.map((label, index) => `
    <section class="page">
      <div class="barcode"><svg id="bc-${index}"></svg></div>
      ${fullLine('Roll id', label.rollCode)}
      ${fullLine('Fabric name', label.fabricName)}
      ${fullLine('Supplier', label.supplierName)}
      ${fullLine('PO No', label.poNumber)}
      ${fullLine('Lot no', label.lotNumber)}
      <div class="grid">
        ${cell('Sort no.', label.sortNo)}
        ${cell('Type', label.fabricType)}
        ${cell('Count', label.countName)}
        ${cell('Color', label.colourName)}
      </div>
    </section>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Roll label preview</title>
    <style>
      @page { size: 100mm 100mm; margin: 0; }
      body { margin: 0; font-family: sans-serif; }
      .page { width: 100mm; height: 100mm; box-sizing: border-box; padding: 6mm 4mm 5mm; page-break-after: always; overflow: hidden; }
      .barcode { display: flex; justify-content: center; }
      .barcode svg { width: 86mm; height: ${Math.max(8, Math.round(settings.barcodeHeight * 25.4 / 203))}mm; }
      .barcode { margin-bottom: 6mm; }
      .line { display: flex; align-items: baseline; gap: 2mm; margin-bottom: 2mm; }
      .line .value { flex: 1; min-width: 0; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 4mm; margin-top: 2mm; }
      .name { font-size: ${Math.max(7, Math.round(settings.nameFontSize * 72 / 203))}pt; color: #444; line-height: 1.1; }
      .value { font-size: ${Math.max(9, Math.round(settings.valueFontSize * 72 / 203))}pt; font-weight: 600; line-height: 1.15; word-break: break-word; }
    </style>
  </head>
  <body>
    ${pages}
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
    <script>
      window.onload = function () {
        const labels = ${JSON.stringify(labels.map((label) => label.barcode))};
        labels.forEach(function (code, index) {
          const el = document.getElementById('bc-' + index);
          if (!el || !code) return;
          JsBarcode(el, code, { format: 'CODE128', width: ${settings.barcodeWidth}, height: ${Math.max(1, Math.round(settings.barcodeHeight * 0.45))}, displayValue: true, fontSize: 12, margin: 0 });
        });
        setTimeout(function () { window.print(); }, 400);
      };
    <\/script>
  </body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
