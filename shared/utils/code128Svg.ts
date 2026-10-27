import { escapeHtml } from '@/shared/utils/printHtmlDocument';

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

export interface Code128SvgSize {
  barHeight?: number;
  displayWidth?: number;
  displayHeight?: number;
}

/**
 * Code 128 set B barcode as an SVG string.
 * Returns an empty string when the text is blank or not printable ASCII.
 * Defaults match the rack sticker (160×48).
 */
export function code128Svg(value: string, size: Code128SvgSize = {}): string {
  const text = value.trim();
  const barHeight = size.barHeight ?? 48;
  const displayWidth = size.displayWidth ?? 160;
  const displayHeight = size.displayHeight ?? 48;
  if (!text || PATTERNS.length !== 107) return '';
  const symbols = code128Symbols(text);
  if (!symbols) return '';
  const bars = drawBars(symbols, barHeight);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bars.width} ${barHeight}" width="${displayWidth}" height="${displayHeight}" role="img" aria-label="${escapeHtml(text)}">${bars.rects}</svg>`;
}

/**
 * Start B, data, checksum, and stop. Null when a character is outside set B.
 */
function code128Symbols(text: string): number[] | null {
  const values = [104];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) return null;
    values.push(code - 32);
  }
  const checksum = values.reduce((sum, value, index) => sum + value * (index === 0 ? 1 : index), 0) % 103;
  return [...values, checksum, 106];
}

/**
 * Quiet zone plus bar/space runs. Width includes the trailing quiet zone.
 */
function drawBars(symbols: number[], barHeight: number): { rects: string; width: number } {
  let x = 10;
  const rects: string[] = [];
  symbols.forEach((symbol) => {
    const pattern = PATTERNS[symbol];
    let bar = true;
    for (const width of pattern) {
      const size = Number(width);
      if (bar) rects.push(`<rect x="${x}" y="0" width="${size}" height="${barHeight}" fill="#111"/>`);
      x += size;
      bar = !bar;
    }
  });
  return { rects: rects.join(''), width: x + 10 };
}
