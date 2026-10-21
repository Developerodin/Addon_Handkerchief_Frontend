import * as XLSX from 'xlsx';
import { escapeHtml, printHtmlDocument } from '@/shared/utils/printHtmlDocument';
import { StorageRackCard } from './RackDetailsDrawer';

const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

/**
 * Code 128 set B bars for a rack code. Returns an SVG string.
 */
export function rackBarcodeSvg(value: string): string {
  const text = value.trim();
  if (!text || PATTERNS.length !== 107) return '';
  const values = [104];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) return '';
    values.push(code - 32);
  }
  const checksum = values.reduce((sum, value, index) => sum + value * (index === 0 ? 1 : index), 0) % 103;
  const symbols = [...values, checksum, 106];
  let x = 10;
  const rects: string[] = [];
  symbols.forEach((symbol) => {
    const pattern = PATTERNS[symbol];
    let bar = true;
    for (const width of pattern) {
      const size = Number(width);
      if (bar) rects.push(`<rect x="${x}" y="0" width="${size}" height="48" fill="#111"/>`);
      x += size;
      bar = !bar;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} 48" width="160" height="48" role="img" aria-label="${escapeHtml(text)}">${rects.join('')}</svg>`;
}

/**
 * Prints one label per rack, with a scannable barcode of the rack code.
 */
export function printRackBarcodes(racks: StorageRackCard[]): void {
  const labels = racks.map((rack) => {
    const code = rack.barcode || rack.code;
    return `<div style="display:inline-block;width:190px;margin:8px;padding:8px;border:1px solid #ddd;text-align:center">${rackBarcodeSvg(code)}<div style="font-weight:700;font-size:13px;margin-top:6px">${escapeHtml(rack.code)}</div></div>`;
  }).join('');
  printHtmlDocument('Rack barcodes', `<h1>Rack barcodes</h1><div>${labels}</div>`);
}

/**
 * Downloads the racks currently in the grid.
 */
export function downloadRacksExcel(racks: StorageRackCard[]): void {
  const rows = racks.map((rack) => ({
    Code: rack.code,
    Name: rack.name,
    Barcode: rack.barcode || rack.code,
    Section: rack.zone || '',
    Floor: rack.floor || '',
    Rolls: rack.count,
    Fabrics: (rack.fabrics || []).join(', '),
    Status: rack.status,
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Racks');
  XLSX.writeFile(book, 'rolls-storage-racks.xlsx');
}
