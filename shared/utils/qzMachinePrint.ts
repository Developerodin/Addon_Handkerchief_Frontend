/**
 * Machine / table barcode labels through QZ Tray — same sizes and layout as rack stickers.
 */

import {
  DEFAULT_RACK_PRINT_SETTINGS,
  RackPrintSettings,
  listQzPrinters,
  settingsForPaperSize,
  stickersFor50x25,
  type RackPaperSize,
} from '@/shared/utils/qzRackPrint';
import { connectQz, sendQzRaw } from '@/shared/utils/qzRollPrint';

export type { RackPaperSize, RackPrintSettings };
export { DEFAULT_RACK_PRINT_SETTINGS, listQzPrinters, settingsForPaperSize, stickersFor50x25 };

export interface MachinePrintItem {
  name: string;
  barcode: string;
  floorLabel: string;
}

interface QzPrinterApi {
  configs: { create: (printer: string, options?: Record<string, unknown>) => unknown };
}

function qzApi(): QzPrinterApi {
  if (!window.qz) throw new Error('QZ Tray did not load');
  return window.qz as unknown as QzPrinterApi;
}

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

function fitBarcodeWidth(value: string, labelWidth: number, requested: number): number {
  let width = Math.max(1, Math.min(5, requested || 2));
  const limit = Math.max(40, labelWidth - 16);
  while (width > 1 && (value.length + 3) * 11 * width > limit) width -= 1;
  return width;
}

function escapeZplText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\^/g, ' ').replace(/~/g, ' ').slice(0, 80);
}

/**
 * ZPL for one machine sticker (50×25 style): name, floor, barcode.
 */
export function generateZPLMachine(
  item: MachinePrintItem,
  options: {
    labelWidth?: number;
    labelHeight?: number;
    xOffset?: number;
    yOffset?: number;
    titleFontSize?: number;
    detailsFontSize?: number;
    barcodeHeight?: number;
    barcodeWidth?: number;
    orientation?: 'horizontal' | 'vertical';
  } = {},
): string {
  const {
    labelWidth = 406,
    labelHeight = 203,
    xOffset = 0,
    yOffset = 0,
    titleFontSize = 26,
    detailsFontSize = 20,
    barcodeHeight = 50,
    barcodeWidth: requestedBarcodeWidth = 4,
    orientation = 'horizontal',
  } = options;

  const name = escapeZplText(item.name);
  const floor = escapeZplText(item.floorLabel ? `Floor: ${item.floorLabel}` : 'Floor: —');
  const barcodeValue = item.barcode;
  const barcodeWidth = fitBarcodeWidth(barcodeValue, labelWidth, requestedBarcodeWidth);

  const labelMargin = 20;
  const isStandalone = yOffset === 0 && xOffset === 0;
  let zpl = '';

  if (isStandalone) {
    zpl += '^XA\n';
    zpl += `^PW${labelWidth}\n`;
    zpl += `^LL${labelHeight}\n`;
    zpl += '^CI28\n';
  }

  if (orientation === 'vertical') {
    const rowLen = labelHeight - labelMargin * 2;
    const bcFullW = (barcodeValue.length + 3) * 11 * barcodeWidth;
    const bcMargin = Math.max(0, (rowLen - bcFullW) / 2);
    const curX = xOffset + 50;
    const step = 50;
    zpl += `^FO${curX},${yOffset + labelMargin}^A0R,${titleFontSize},${titleFontSize}^FB${rowLen},2,0,C^FD${name}^FS\n`;
    zpl += `^FO${curX + step},${yOffset + labelMargin}^A0R,${detailsFontSize},${detailsFontSize}^FB${rowLen},1,0,C^FD${floor}^FS\n`;
    zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
    zpl += `^FO${xOffset + labelWidth - barcodeHeight - 30},${yOffset + labelMargin + bcMargin}^BCR,${barcodeHeight},N,N,N^FD${barcodeValue}^FS\n`;
    if (isStandalone) zpl += '^XZ\n';
    return zpl;
  }

  const contentWidth = labelWidth - labelMargin * 2;
  const curY = yOffset + 20;
  zpl += `^FO${xOffset + labelMargin},${curY}^A0N,${titleFontSize},${titleFontSize}^FB${contentWidth},2,0,C^FD${name}^FS\n`;
  zpl += `^FO${xOffset + labelMargin},${curY + titleFontSize + 8}^A0N,${detailsFontSize},${detailsFontSize}^FB${contentWidth},1,0,C^FD${floor}^FS\n`;
  zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
  zpl += `^FO${xOffset + Math.max(0, (labelWidth - (barcodeValue.length + 3) * 11 * barcodeWidth) / 2)},${yOffset + labelHeight - barcodeHeight - 28}^BCN,${barcodeHeight},N,N,N^FD${barcodeValue}^FS\n`;
  if (isStandalone) zpl += '^XZ\n';
  return zpl;
}

export async function printMachines(
  machines: MachinePrintItem[],
  options: { printerName?: string; customSettings?: RackPrintSettings } = {},
): Promise<{ success: boolean; printed: number; printer?: string; error?: string }> {
  try {
    if (!machines.length) return { success: false, printed: 0, error: 'No machines to print' };

    const defaultPrinter = await connectQz();
    const printer = options.printerName || defaultPrinter;
    const config = getQzConfig(options.customSettings, printer);

    const settings = options.customSettings;
    if (!settings) {
      const labels = machines.map((row) => generateZPLMachine(row));
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

    for (let i = 0; i < machines.length; i += labelsPerSheet) {
      let zpl = `^XA\n^PW${paperWidth}\n^LL${paperHeight}\n^CI28\n`;
      for (let j = 0; j < labelsPerSheet && i + j < machines.length; j += 1) {
        const machine = machines[i + j];
        const row = Math.floor(j / columnsPerRow);
        const col = j % columnsPerRow;
        zpl += generateZPLMachine(machine, {
          labelWidth,
          labelHeight,
          xOffset: col * labelWidth,
          yOffset: row === 0 ? settings.firstLabelTopMargin || 0 : row * labelHeight,
          titleFontSize: settings.rackCodeFontSize || 26,
          detailsFontSize: settings.detailsFontSize || 20,
          barcodeHeight: settings.barcodeHeight || 50,
          barcodeWidth: settings.barcodeWidth || 4,
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
    return { success: true, printed: machines.length, printer };
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