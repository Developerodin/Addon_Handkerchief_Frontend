import { FabricCatalog } from '@/shared/services/fabricCatalogService';
import { newLineId } from '@/shared/services/factoryApi';
import {
  FabricPoLine,
  defaultMeterUnit,
  fabricColorLabel,
  fabricTypeLabel,
  gstNumber,
  matchFabric,
  matchMeasurement,
  measurementLabel,
} from './purchaseOrderFormModel';
import { FabricMeasurementLookup } from '@/shared/services/fabricLookupService';

export interface ParsedFabricRow {
  fabricName: string;
  fabricTypeName: string;
  colourName: string;
  fabricSortNo: string;
  millOldFabricSortNo: string;
  millNewFabricSortNo: string;
  rate: string;
  quantity: string;
  unit: string;
  estimatedDelivery: string;
  gstPercent: string;
}

const HEADERS = [
  'Fabric Name',
  'Fabric Type',
  'Color',
  'Sort No',
  'Mill Old',
  'Mill New',
  'Rate',
  'Quantity',
  'Unit',
  'Est. Delivery',
  'GST %',
] as const;

/**
 * Downloads an empty fabric-item template.
 */
export async function downloadFabricItemsTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [...HEADERS],
    Array.from({ length: HEADERS.length }, () => ''),
  ]);
  sheet['!cols'] = HEADERS.map((header) => ({ wch: Math.max(header.length + 4, 16) }));
  XLSX.utils.book_append_sheet(book, sheet, 'Fabric items');
  XLSX.writeFile(book, 'fabric-po-template.xlsx');
}

/**
 * Exports the current fabric lines.
 */
export async function downloadFabricItemsExcel(lines: FabricPoLine[]): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = lines.map((line) => ({
    'Fabric Name': line.fabricName || line.query,
    'Fabric Type': line.fabricTypeName,
    Color: line.colourName,
    'Sort No': line.fabricSortNo,
    'Mill Old': line.millOldFabricSortNo,
    'Mill New': line.millNewFabricSortNo,
    Rate: line.rate,
    Quantity: line.quantity,
    Unit: line.unitName,
    'Est. Delivery': line.estimatedDelivery,
    'GST %': line.gstPercent,
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Fabric Name': '' }]), 'Fabric items');
  XLSX.writeFile(book, 'fabric-po-items.xlsx');
}

/**
 * Reads fabric rows from an uploaded workbook. Invalid numbers are reported, not imported.
 */
export async function parseFabricItemsExcel(file: File): Promise<{ rows: ParsedFabricRow[]; errors: string[] }> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) return { rows: [], errors: ['The workbook has no sheet'] };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const rows: ParsedFabricRow[] = [];
  const errors: string[] = [];
  raw.forEach((record, index) => {
    const parsed = parseRecord(record, index + 2);
    if (parsed.error) errors.push(parsed.error);
    else if (parsed.row) rows.push(parsed.row);
  });
  return { rows, errors };
}

/**
 * Turns one imported row into a form line, matched against the supplier fabrics.
 */
export function lineFromImport(
  row: ParsedFabricRow,
  fabrics: FabricCatalog[],
  units: FabricMeasurementLookup[],
  fallbackDelivery: string
): FabricPoLine {
  const match = matchFabric(fabrics, row);
  const unit = row.unit.trim() ? matchMeasurement(units, row.unit) : undefined;
  const meter = !row.unit.trim() ? defaultMeterUnit(units) : null;
  return {
    lineId: newLineId(),
    query: match?.name || row.fabricName,
    fabricId: match?.id || '',
    fabricName: match?.name || '',
    fabricTypeName: match ? fabricTypeLabel(match) : row.fabricTypeName,
    colourName: match ? fabricColorLabel(match) : row.colourName,
    fabricSortNo: match?.fabricSortNo || row.fabricSortNo || '',
    millOldFabricSortNo: match?.millOldFabricSortNo || row.millOldFabricSortNo || '',
    millNewFabricSortNo: match?.millNewFabricSortNo || row.millNewFabricSortNo || '',
    quantity: row.quantity,
    unitId: unit?.id || meter?.unitId || '',
    unitName: unit ? measurementLabel(unit) : meter?.unitName || '',
    rate: row.rate || (match?.rate != null ? String(match.rate) : ''),
    gstPercent: row.gstPercent || gstNumber(match?.gst),
    estimatedDelivery: row.estimatedDelivery || fallbackDelivery,
    unmatched: !match,
  };
}

/**
 * Maps a sheet row onto the template columns. Blank rows are skipped.
 */
function parseRecord(record: Record<string, unknown>, excelRow: number): { row?: ParsedFabricRow; error?: string } {
  const fabricName = cell(record, 'fabric name');
  const fabricTypeName = cell(record, 'fabric type');
  const colourName = cell(record, 'color') || cell(record, 'colour');
  const fabricSortNo = cell(record, 'sort no') || cell(record, 'sort no.');
  const millOldFabricSortNo = cell(record, 'mill old') || cell(record, 'mill old fabric sort no.');
  const millNewFabricSortNo = cell(record, 'mill new') || cell(record, 'mill new fabric sort no.');
  const rate = cell(record, 'rate');
  const quantity = cell(record, 'quantity');
  const unit = cell(record, 'unit');
  const gstPercent = cell(record, 'gst %') || cell(record, 'gst');
  const estimatedDelivery = dateCell(record['Est. Delivery'] ?? record['est. delivery'] ?? record['Estimated Delivery']);
  if (
    ![
      fabricName,
      fabricTypeName,
      colourName,
      fabricSortNo,
      millOldFabricSortNo,
      millNewFabricSortNo,
      rate,
      quantity,
      unit,
      gstPercent,
      estimatedDelivery,
    ].some(Boolean)
  ) {
    return {};
  }
  if (!fabricName) return { error: `Row ${excelRow}: fabric name is required` };
  if (rate && !isDecimal(rate)) return { error: `Row ${excelRow}: rate must be a number` };
  if (quantity && !isDecimal(quantity)) return { error: `Row ${excelRow}: quantity must be a number` };
  if (gstPercent && (!isDecimal(gstPercent) || Number(gstPercent) > 100)) {
    return { error: `Row ${excelRow}: GST must be between 0 and 100` };
  }
  return {
    row: {
      fabricName,
      fabricTypeName,
      colourName,
      fabricSortNo,
      millOldFabricSortNo,
      millNewFabricSortNo,
      rate,
      quantity,
      unit,
      estimatedDelivery,
      gstPercent,
    },
  };
}

/** Case-insensitive cell lookup. */
function cell(record: Record<string, unknown>, header: string): string {
  const key = Object.keys(record).find((name) => name.trim().toLowerCase() === header);
  return key ? String(record[key] ?? '').trim() : '';
}

/** True for a non-negative decimal. */
function isDecimal(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value);
}

/**
 * Normalises an Excel date, a serial, or a dd/mm/yyyy string to YYYY-MM-DD.
 */
function dateCell(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
    return utc.toISOString().slice(0, 10);
  }
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!dmy) return '';
  return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
}
