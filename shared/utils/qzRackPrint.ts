/**
 * Prints fabric-storage rack barcodes through QZ Tray.
 * Paper size, columns, and ZPL match the yarn app rack labels.
 * Connection stays unsigned, same as roll printing.
 */

import { connectQz, ensureQzPrinter, runQzExclusive, sendQzRaw } from '@/shared/utils/qzRollPrint';

export type RackPaperSize = '4x6' | '6x4' | '1.96x2.75' | '50mm * 25mm' | '50mm * 70mm';

export interface RackPrintItem {
  rackCode: string;
  barcode: string;
  shelf?: number | string;
  floor?: number | string;
  zone?: string;
}

export interface RackPrintSettings {
  paperSize: RackPaperSize;
  paperWidth: number;
  paperHeight: number;
  labelsPerPage: number;
  columnsPerRow: number;
  firstLabelTopMargin: number;
  showCutLines: boolean;
  zoneFontSize: number;
  rackCodeFontSize: number;
  detailsFontSize: number;
  barcodeHeight: number;
  barcodeWidth: number;
  orientation: 'horizontal' | 'vertical';
}

/** 50×25 mm stickers, two across, matching the roll in the printer. */
export const DEFAULT_RACK_PRINT_SETTINGS: RackPrintSettings = {
  paperSize: '50mm * 25mm',
  paperWidth: 812,
  paperHeight: 203,
  labelsPerPage: 2,
  columnsPerRow: 2,
  firstLabelTopMargin: 0,
  showCutLines: false,
  zoneFontSize: 30,
  rackCodeFontSize: 26,
  detailsFontSize: 20,
  barcodeHeight: 50,
  barcodeWidth: 4,
  orientation: 'horizontal',
};

interface QzPrinterApi {
  websocket: { isActive: () => boolean };
  printers: {
    getDefault: () => Promise<string | null>;
    find: (query?: string) => Promise<string | string[] | null>;
  };
  configs: {
    create: (printer: string, options?: Record<string, unknown>) => unknown;
  };
  print: (config: unknown, data: unknown[]) => Promise<void>;
}

/**
 * Applies a paper-size preset. 50×25 uses one barcode per sticker and widens the page for each extra column.
 */
export function settingsForPaperSize(size: RackPaperSize, current: RackPrintSettings): RackPrintSettings {
  if (size === '4x6') {
    return { ...current, paperSize: '4x6', paperWidth: 812, paperHeight: 1218, orientation: 'horizontal' };
  }
  if (size === '6x4') {
    return { ...current, paperSize: '6x4', paperWidth: 1218, paperHeight: 812, orientation: 'horizontal' };
  }
  if (size === '1.96x2.75' || size === '50mm * 70mm') {
    return {
      ...current,
      paperSize: size,
      paperWidth: 398,
      paperHeight: 558,
      labelsPerPage: 1,
      columnsPerRow: 1,
      orientation: 'vertical',
      firstLabelTopMargin: 20,
      rackCodeFontSize: 40,
      barcodeHeight: 100,
      detailsFontSize: 40,
      barcodeWidth: 3,
    };
  }
  return stickersFor50x25({
    ...current,
    paperSize: '50mm * 25mm',
    labelsPerPage: 2,
    columnsPerRow: 2,
    rackCodeFontSize: 26,
    detailsFontSize: 20,
    barcodeHeight: 50,
    barcodeWidth: 4,
    orientation: 'horizontal',
  });
}

/**
 * Keeps each 50×25 sticker at 406×203 dots. Columns widen the page instead of squeezing two barcodes onto one sticker.
 */
export function stickersFor50x25(settings: RackPrintSettings): RackPrintSettings {
  if (settings.paperSize !== '50mm * 25mm') return settings;
  const columns = Math.min(4, Math.max(1, settings.columnsPerRow || 1));
  const labels = Math.max(1, settings.labelsPerPage || 1);
  const rows = Math.max(1, Math.ceil(labels / columns));
  return {
    ...settings,
    columnsPerRow: columns,
    labelsPerPage: rows * columns,
    paperWidth: 406 * columns,
    paperHeight: 203 * rows,
  };
}

/**
 * Narrows the barcode until it fits the sticker. Long rack codes at width 2 run off a 50 mm label and the printer feeds a blank.
 */
function fitBarcodeWidth(value: string, labelWidth: number, requested: number): number {
  let width = Math.max(1, Math.min(5, requested || 2));
  const limit = Math.max(40, labelWidth - 16);
  while (width > 1 && (value.length + 3) * 11 * width > limit) width -= 1;
  return width;
}

/**
 * QZ Tray API after the shared script has loaded.
 */
function qzApi(): QzPrinterApi {
  if (!window.qz) throw new Error('QZ Tray did not load');
  return window.qz as unknown as QzPrinterApi;
}

/**
 * Printers QZ Tray can see, plus the Windows default.
 */
export function listQzPrinters(): Promise<{ defaultPrinter: string; printers: string[] }> {
  return runQzExclusive(async () => {
    const defaultPrinter = await ensureQzPrinter();
    const found = await qzApi().printers.find();
    const printers = Array.isArray(found) ? found.filter(Boolean) : [defaultPrinter];
    if (!printers.includes(defaultPrinter)) printers.unshift(defaultPrinter);
    return { defaultPrinter, printers };
  });
}

/**
 * Thermal page size in millimetres. Dots are 203 DPI, so 406×203 dots is 50.75×25.375 mm.
 * forceRaw keeps ZPL as printer commands. Without it QZ draws the text as a blank page.
 */
function getQzConfig(customSettings: Pick<RackPrintSettings, 'paperWidth' | 'paperHeight'> | undefined, printerName: string) {
  let width = 101.6;
  let height = 152.4;
  if (customSettings?.paperWidth != null && customSettings?.paperHeight != null) {
    width = customSettings.paperWidth * 0.125;
    height = customSettings.paperHeight * 0.125;
  }
  return qzApi().configs.create(printerName, {
    size: { width, height },
    units: 'mm',
    density: 203,
    colorType: 'black-white',
    interpolation: 'nearest-neighbor',
    forceRaw: true,
  });
}

/**
 * ZPL for one rack sticker. On a narrow label, xOffset shifts the second column
 * so two barcodes on one sheet do not draw on top of each other.
 */
export function generateZPLRack(
  rackCode: string,
  barcodeValue: string,
  options: {
    shelf?: number | string;
    floor?: number | string;
    zone?: string;
    labelWidth?: number;
    labelHeight?: number;
    xOffset?: number;
    yOffset?: number;
    zoneFontSize?: number;
    rackCodeFontSize?: number;
    detailsFontSize?: number;
    barcodeHeight?: number;
    barcodeWidth?: number;
    orientation?: 'horizontal' | 'vertical';
  } = {},
): string {
  const {
    shelf,
    floor,
    labelWidth = 812,
    labelHeight = 400,
    xOffset = 0,
    yOffset = 0,
    rackCodeFontSize = 80,
    detailsFontSize = 40,
    barcodeHeight = 80,
    barcodeWidth: requestedBarcodeWidth = 2,
    orientation = 'horizontal',
  } = options;

  const barcodeWidth = fitBarcodeWidth(barcodeValue, labelWidth, requestedBarcodeWidth);

  const labelMargin = 20;
  const isStandalone = yOffset === 0 && xOffset === 0 && !options.labelWidth;
  let zpl = '';

  if (isStandalone) {
    zpl += '^XA\n';
    zpl += `^PW${labelWidth}\n`;
    zpl += `^LL${labelHeight}\n`;
    zpl += '^CI28\n';
  }

  if (labelWidth < 500) {
    if (orientation === 'vertical') {
      const rowLen = labelHeight - labelMargin * 2;
      const bcFullW = (barcodeValue.length + 3) * 11 * barcodeWidth;
      const bcMargin = Math.max(0, (rowLen - bcFullW) / 2);
      const curX = xOffset + 50;
      const step = 50;

      zpl += `^FO${curX},${yOffset + labelMargin}^A0R,${rackCodeFontSize},${rackCodeFontSize}^FB${rowLen},1,0,C^FD${rackCode}^FS\n`;
      zpl += `^FO${curX + step},${yOffset + labelMargin}^A0R,${detailsFontSize},${detailsFontSize}^FB${rowLen},1,0,C^FDShelf: ${shelf || '-'} | Floor: ${floor || '-'}^FS\n`;
      zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
      zpl += `^FO${xOffset + labelWidth - barcodeHeight - 30},${yOffset + labelMargin + bcMargin}^BCR,${barcodeHeight},N,N,N^FD${barcodeValue}^FS\n`;
      if (isStandalone) zpl += '^XZ\n';
      return zpl;
    }

    const contentWidth = labelWidth - labelMargin * 2;
    const curY = yOffset + 30;
    zpl += `^FO${xOffset + labelMargin},${curY}^A0N,${rackCodeFontSize},${rackCodeFontSize}^FB${contentWidth},1,0,C^FD${rackCode}^FS\n`;
    zpl += `^FO${xOffset + labelMargin},${curY + rackCodeFontSize + 4}^A0N,${detailsFontSize},${detailsFontSize}^FB${contentWidth},1,0,C^FDShelf: ${shelf || '-'} | Floor: ${floor || '-'}^FS\n`;
    zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
    zpl += `^FO${xOffset + Math.max(0, (labelWidth - (barcodeValue.length + 3) * 11 * barcodeWidth) / 2)},${yOffset + labelHeight - barcodeHeight - 30}^BCN,${barcodeHeight},N,N,N^FD${barcodeValue}^FS\n`;
    if (isStandalone) zpl += '^XZ\n';
    return zpl;
  }

  if (orientation === 'vertical') {
    const totalStackWidth = rackCodeFontSize + 60 + detailsFontSize + 40 + barcodeWidth * 11 * 4;
    const startX = xOffset + Math.max(labelMargin, (labelWidth - totalStackWidth) / 2);
    const startY = yOffset + labelMargin;
    const rowLength = labelHeight - labelMargin * 2;
    let currentX = startX;

    zpl += `^FO${currentX},${startY}^A0R,${rackCodeFontSize},${rackCodeFontSize}^FB${rowLength},1,0,C^FD${rackCode}^FS\n`;
    currentX += rackCodeFontSize + 60;
    if (shelf !== undefined || floor !== undefined) {
      zpl += `^FO${currentX},${startY}^A0R,${detailsFontSize},${detailsFontSize}^FB${rowLength},1,0,C^FDShelf: ${shelf || '-'} | Floor: ${floor || '-'}^FS\n`;
      currentX += detailsFontSize + 40;
    }
    const barcodeFullWidth = (barcodeValue.length + 3) * 11 * barcodeWidth;
    const bcY = startY + Math.max(0, (rowLength - barcodeFullWidth) / 2);
    zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
    zpl += `^FO${currentX},${bcY}^BCR,${barcodeHeight},Y,N,N^FD${barcodeValue}^FS\n`;
  } else {
    const totalStackHeight = rackCodeFontSize + 20 + detailsFontSize + 20 + barcodeHeight + 40;
    const startY = yOffset + Math.max(labelMargin, (labelHeight - totalStackHeight) / 2);
    const startX = xOffset + labelMargin;
    const rowLength = labelWidth - labelMargin * 2;
    let currentY = startY;

    zpl += `^FO${startX},${currentY}^A0N,${rackCodeFontSize},${rackCodeFontSize}^FB${rowLength},1,0,C^FD${rackCode}^FS\n`;
    currentY += rackCodeFontSize + 20;
    if (shelf !== undefined || floor !== undefined) {
      zpl += `^FO${startX},${currentY}^A0N,${detailsFontSize},${detailsFontSize}^FB${rowLength},1,0,C^FDShelf: ${shelf || '-'} | Floor: ${floor || '-'}^FS\n`;
      currentY += detailsFontSize + 20;
    }
    const barcodeFullWidth = (barcodeValue.length + 3) * 11 * barcodeWidth;
    const bcX = startX + Math.max(0, (rowLength - barcodeFullWidth) / 2);
    zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
    zpl += `^FO${bcX},${currentY}^BCN,${barcodeHeight},Y,N,N^FD${barcodeValue}^FS\n`;
  }

  if (isStandalone) zpl += '^XZ\n';
  return zpl;
}

/**
 * Sends the filtered racks to the default QZ printer, one sheet per page of labels.
 */
export async function printRacks(
  racks: RackPrintItem[],
  options: { printerName?: string; customSettings?: RackPrintSettings } = {},
): Promise<{ success: boolean; printed: number; printer?: string; error?: string }> {
  try {
    if (!racks.length) return { success: false, printed: 0, error: 'No racks to print' };

    const defaultPrinter = await connectQz();
    const printer = options.printerName || defaultPrinter;
    const config = getQzConfig(options.customSettings, printer);

    const settings = options.customSettings;
    if (!settings) {
      const labels = racks.map((rack) => generateZPLRack(rack.rackCode, rack.barcode, {
        shelf: rack.shelf,
        floor: rack.floor,
        zone: rack.zone,
      }));
      await sendQzRaw(config, labels);
      return { success: true, printed: labels.length, printer };
    }

    const paperWidth = settings.paperWidth || 812;
    const paperHeight = settings.paperHeight || 1218;
    const columnsPerRow = settings.columnsPerRow || 1;
    const labelsPerPage = settings.labelsPerPage || 1;
    const labelWidth = Math.floor(paperWidth / columnsPerRow);
    const rowsPerPage = Math.ceil(labelsPerPage / columnsPerRow);
    const labelHeight = Math.floor(paperHeight / rowsPerPage);
    const labelsPerSheet = rowsPerPage * columnsPerRow;
    const labels: string[] = [];

    for (let i = 0; i < racks.length; i += labelsPerSheet) {
      let zpl = `^XA\n^PW${paperWidth}\n^LL${paperHeight}\n^CI28\n`;
      for (let j = 0; j < labelsPerSheet && i + j < racks.length; j += 1) {
        const rack = racks[i + j];
        const row = Math.floor(j / columnsPerRow);
        const col = j % columnsPerRow;
        zpl += generateZPLRack(rack.rackCode, rack.barcode, {
          shelf: rack.shelf,
          floor: rack.floor,
          zone: rack.zone,
          labelWidth,
          labelHeight,
          xOffset: col * labelWidth,
          yOffset: row === 0 ? settings.firstLabelTopMargin || 0 : row * labelHeight,
          zoneFontSize: settings.zoneFontSize || 20,
          rackCodeFontSize: settings.rackCodeFontSize || 50,
          detailsFontSize: settings.detailsFontSize || 20,
          barcodeHeight: settings.barcodeHeight || 70,
          barcodeWidth: settings.barcodeWidth || 2,
          orientation: settings.orientation,
        });
      }
      if (settings.showCutLines !== false) {
        for (let row = 1; row < rowsPerPage; row += 1) {
          zpl += `^FO0,${row * labelHeight}^GB${paperWidth},1,1^FS\n`;
        }
        for (let col = 1; col < columnsPerRow; col += 1) {
          zpl += `^FO${col * labelWidth},0^GB1,${paperHeight},1^FS\n`;
        }
      }
      zpl += '^XZ\n';
      labels.push(zpl);
    }

    await sendQzRaw(config, labels);
    return { success: true, printed: racks.length, printer };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Print failed';
    if (message.includes('blocked') || message.includes('Request blocked')) {
      const currentUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
      return {
        success: false,
        printed: 0,
        error: `Request blocked by QZ Tray. Add this site in QZ Tray → Site Manager → + → ${currentUrl}`,
      };
    }
    return { success: false, printed: 0, error: message || 'Print failed' };
  }
}
