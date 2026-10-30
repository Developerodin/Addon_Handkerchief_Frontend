import type { PurchaseOrderLine } from '@/shared/services/factoryApi';
import { cutoffKey } from './cutoffApproval';
import { PackingCarton, TransitPackEntry } from './markInTransitModel';

export interface FabricMasterHit {
  id: string;
  name?: string;
  fabricSortNo?: string;
  millOldFabricSortNo?: string;
  millNewFabricSortNo?: string;
  fabricTypeName?: string;
  colourName?: string;
  countName?: string;
}

export interface ParsedPackingList {
  millName: string;
  consigneeName: string;
  customerCity: string;
  invoiceNumber: string;
  invoiceDate: string;
  orderNo: string;
  orderDate: string;
  division: string;
  lrNo: string;
  lrDate: string;
  truckNo: string;
  transporter: string;
  packingNumber: string;
  cartons: PackingCarton[];
  warnings: string[];
}

const HEADER_LABELS = [
  'consignee name',
  'customer city',
  'invoice number',
  'invoice date',
  'order no',
  'order date',
  'division',
  'lr no',
  'lr date',
  'truck no',
  'transporter',
];

function canonicalMillKey(key: string): string {
  const parts = key.match(/^(NVCND)(\d+)$/);
  if (!parts || parts[2].length <= 6) return key;
  return `NVCND${parts[2].slice(-6)}`;
}

/**
 * Mill old sort is the letter-and-digit token before X on the material line.
 * NVCND000058X01325 yields NVCND000058. AW0581523A has no X and is not this key.
 */
export function millOldSortKey(material: string): string {
  const source = material
    .toUpperCase()
    .replace(/NYCD/g, 'NVCND')
    .replace(/NVCND[OQ]/g, 'NVCND')
    .replace(/NVCND[0-9OQ]+X[0-9OQ]+/g, (token) => token.replace(/[OQ]/g, '0'));
  const matches = source.match(/[A-Z]{2,}\d{3,}\s*X\s*\d+/gi) || [];
  const last = matches[matches.length - 1];
  if (last) {
    const key = last.match(/^([A-Z]{2,}\d{3,})/i);
    return key ? canonicalMillKey(key[1].toUpperCase().replace(/[OQ]/g, '0')) : '';
  }
  const bare = source.match(/NVCND[0-9OQ]{3,}/);
  return bare ? canonicalMillKey(bare[0].replace(/[OQ]/g, '0')) : '';
}

/** M is the measurement symbol for Meter. */
export function measurementName(symbol: string): string {
  const token = symbol.trim().toLowerCase();
  if (token === 'm' || token === 'meter' || token === 'metre' || token === 'mtr') return 'Meter';
  return symbol.trim();
}

export function sameMeasurement(symbol: string, unitName: string): boolean {
  const unit = unitName.trim().toLowerCase();
  if (!unit || !symbol.trim()) return true;
  return measurementName(symbol).toLowerCase() === measurementName(unit).toLowerCase();
}

function repairOcr(text: string): string {
  const lines = text.replace(/\r/g, '\n').replace(/\bNYCD/gi, 'NVCND').replace(/\bNVCND[OQ]/gi, 'NVCND').split('\n').map((line) => (
    line.replace(/NVCND[0-9OQ]+X[0-9OQ]+/gi, (token) => token.toUpperCase().replace(/[OQ]/g, '0'))
  ));
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/\b(VN)(\d{6,9})\b/);
    if (!match || match[2].length >= 10) continue;
    const need = 10 - match[2].length;
    for (let next = index + 1; next < Math.min(index + 4, lines.length); next += 1) {
      if (/NVCND/i.test(lines[next])) break;
      const suffix = lines[next].match(new RegExp(`(?:^|\\s)(\\d{${need}})(?=\\s|$)`));
      if (!suffix) continue;
      lines[index] = lines[index].replace(`${match[1]}${match[2]}`, `${match[1]}${match[2]}${suffix[1]}`);
      lines[next] = lines[next].replace(suffix[0], ' ');
      break;
    }
  }
  return lines.join('\n');
}

function fieldAfter(text: string, label: string): string {
  const source = text.toLowerCase();
  const at = source.indexOf(label);
  if (at < 0) return '';
  let rest = text.slice(at + label.length).replace(/^[\s:.\-–]+/, '');
  const lower = rest.toLowerCase();
  let cut = rest.length;
  HEADER_LABELS.forEach((other) => {
    if (other === label) return;
    const next = lower.indexOf(other);
    if (next >= 0 && next < cut) cut = next;
  });
  const value = clean(rest.slice(0, cut).split('\n')[0] || '');
  if (/^(carton|material|count|net|gross|uom|product|batch|size)$/i.test(value)) return '';
  return value;
}

function usable(value: string): string {
  const text = clean(value);
  if (!text || text.includes(':') || /^(customer|invoice|order|division|truck|transporter|page)\b/i.test(text)) return '';
  return text;
}

function companyBeside(text: string, label: string): string {
  const at = text.toLowerCase().indexOf(label);
  if (at < 0) return '';
  const window = text.slice(Math.max(0, at - 120), at + 180).replace(/\n/g, ' ');
  const name = window.match(/\b([A-Z]{3,}(?:\s+[A-Z]{3,}){1,5})\b/);
  if (!name) return '';
  return /LIMITED/i.test(window) && !/LIMITED/i.test(name[1]) ? `${clean(name[1])} LIMITED` : clean(name[1]);
}

function millNameFrom(text: string): string {
  const head = text.split(/detailed packing list/i)[0] || '';
  const lines = head
    .split('\n')
    .map((line) => clean(line))
    .filter((line) => /^[A-Z][A-Z\s.&]{6,}$/.test(line) && !/PAGE/.test(line));
  return lines[0] || '';
}

function toIsoDate(value: string): string {
  const text = value.trim();
  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!dmy) return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
  return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
}

function packingNumberFromFile(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').trim();
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function materialFrom(before: string): string {
  const lines = before
    .split(/\n/)
    .map((line) => clean(line))
    .filter((line) => line && !/material code|carton number|subtotal|net wt|gross wt|design \/|finish width/i.test(line));
  let start = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (/\bCTN\b/i.test(lines[index]) || /DBY-/i.test(lines[index])) {
      start = index;
      if (/\bCTN\b/i.test(lines[index])) break;
    }
  }
  return (start >= 0 ? lines.slice(start) : lines.slice(-4)).join('\n').trim();
}

function millLine(after: string): string {
  const line = after.split('\n').map((row) => clean(row)).find((row) => /[A-Z]{2,}\d{3,}\s*X\s*\d+/i.test(row));
  return line || '';
}

function columnTail(after: string): string {
  const stop = after.search(/\bCTN\b|\bsubtotal\b|\([A-Z]{2,}\d{3,}X|[A-Z]{2,}\d{3,}\s*X\s*\d+/i);
  const chunk = stop >= 0 ? after.slice(0, stop) : after.split(/\n/).slice(0, 2).join(' ');
  return clean(chunk);
}

function emptyCarton(partial: Partial<PackingCarton>): PackingCarton {
  return {
    materialCode: '',
    millSortKey: '',
    fabricId: '',
    fabricName: '',
    fabricSortNo: '',
    millOldFabricSortNo: '',
    millNewFabricSortNo: '',
    fabricTypeName: '',
    colourName: '',
    cartonNumber: '',
    count: '',
    netWeight: '',
    grossWeight: '',
    totalPcs: '',
    totalQty: '',
    uom: '',
    designShade: '',
    product: '',
    batch: '',
    finishWidth: '',
    lotNumber: '',
    size: '',
    lineId: '',
    extras: [],
    ...partial,
  };
}

function looseColumns(columns: string): Partial<PackingCarton> {
  const shade = columns.match(/\b(\d{5,}[A-Z])\b/);
  const batch = columns.match(/\b(\d{8,12})\b/);
  const product = columns.match(/\b((?:WOVEN|KNIT(?:TED)?) FABRIC)\b/i);
  const uom = columns.match(/\b([A-Za-z]{1,4})\b/);
  const numbers = columns.match(/\b\d+(?:\.\d+)?\b/g) || [];
  const weights = numbers.filter((value) => value !== batch?.[1] && value !== shade?.[1]?.replace(/\D/g, ''));
  return {
    count: weights[0] || '',
    netWeight: weights[1] || '',
    grossWeight: weights[2] || '',
    totalPcs: weights[3] || '',
    totalQty: weights[4] || '',
    uom: uom && uom[1].toUpperCase() === 'M' ? 'M' : '',
    designShade: shade?.[1] || '',
    product: product ? product[1].toUpperCase() : '',
    batch: batch?.[1] || '',
    finishWidth: weights[5] || '',
  };
}

function cartonFromParts(before: string, cartonNumber: string, after: string): PackingCarton {
  const mill = millLine(after);
  const materialCode = [materialFrom(before), mill].filter(Boolean).join('\n');
  const columns = columnTail(after.split(mill).join(' '));
  const match = columns.match(
    /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Za-z]{1,6})\s+(\S+)\s+(.+?)\s+(\d{6,})(?:\s+(\d+(?:\.\d+)?))?(?:\s+(\S+))?(?:\s+(\S+))?$/
  );
  const loose = match ? null : looseColumns(columns);
  return emptyCarton({
    materialCode,
    millSortKey: millOldSortKey(materialCode),
    cartonNumber,
    count: match?.[1] || loose?.count || '',
    netWeight: match?.[2] || loose?.netWeight || '',
    grossWeight: match?.[3] || loose?.grossWeight || '',
    totalPcs: match?.[4] || loose?.totalPcs || '',
    totalQty: match?.[5] || loose?.totalQty || '',
    uom: (match?.[6] || loose?.uom || '').toUpperCase() === 'M' ? 'M' : (match?.[6] || loose?.uom || ''),
    designShade: match?.[7] || loose?.designShade || '',
    product: clean(match?.[8] || loose?.product || ''),
    batch: match?.[9] || loose?.batch || '',
    finishWidth: match?.[10] || loose?.finishWidth || '',
    lotNumber: match?.[11] && !/^\d+(?:\.\d+)?$/.test(match[11]) ? match[11] : '',
    size: match?.[12] || '',
    extras: !match && !loose?.designShade && !loose?.batch && columns ? [{ label: 'Unread columns', value: columns }] : [],
  });
}

function parseCartons(text: string): PackingCarton[] {
  const tableAt = text.search(/material\s+code/i);
  const table = tableAt >= 0 ? text.slice(tableAt) : text;
  const re = /\b(VN\d{10,12})\b/gi;
  const found: Array<{ index: number; number: string }> = [];
  let hit = re.exec(table);
  while (hit) {
    found.push({ index: hit.index, number: hit[1].toUpperCase() });
    hit = re.exec(table);
  }
  return found
    .map((row, index) => {
      const previous = index === 0 ? 0 : found[index - 1].index + found[index - 1].number.length;
      const next = index + 1 < found.length ? found[index + 1].index : table.length;
      return cartonFromParts(table.slice(previous, row.index), row.number, table.slice(row.index + row.number.length, next));
    })
    .filter((row) => row.cartonNumber.length >= 12 && !/subtotal/i.test(row.materialCode));
}

/**
 * Turns packing-list text into header fields and one carton per row.
 * The open purchase-order number is not part of the saved result.
 */
export function parsePackingListText(text: string, fileName: string): ParsedPackingList {
  const normalized = repairOcr(text);
  const cartons = parseCartons(normalized);
  const warnings: string[] = [];
  if (!cartons.length) warnings.push('No carton rows were read. Check the preview before saving.');
  const zeroCount = cartons.filter((row) => !(Number(row.count) > 0)).length;
  if (zeroCount) warnings.push(`${zeroCount} carton${zeroCount === 1 ? '' : 's'} have count 0. Rolls are counted as 1 per carton until you enter a count.`);
  const zeroWeight = cartons.filter((row) => !(Number(row.grossWeight) > 0)).length;
  if (zeroWeight) warnings.push('Gross weight is 0. Enter the weight on each carton before saving.');
  return {
    millName: millNameFrom(normalized),
    consigneeName: usable(fieldAfter(normalized, 'consignee name')) || companyBeside(normalized, 'consignee name'),
    customerCity: usable(fieldAfter(normalized, 'customer city')),
    invoiceNumber: usable(fieldAfter(normalized, 'invoice number')),
    invoiceDate: toIsoDate(fieldAfter(normalized, 'invoice date')),
    orderNo: usable(fieldAfter(normalized, 'order no')),
    orderDate: toIsoDate(fieldAfter(normalized, 'order date')),
    division: usable(fieldAfter(normalized, 'division')),
    lrNo: usable(fieldAfter(normalized, 'lr no')),
    lrDate: toIsoDate(fieldAfter(normalized, 'lr date')),
    truckNo: usable(fieldAfter(normalized, 'truck no')),
    transporter: usable(fieldAfter(normalized, 'transporter')),
    packingNumber: packingNumberFromFile(fileName),
    cartons,
    warnings,
  };
}

function textOf(value: unknown): string {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return row[key];
  }
  return '';
}

function asNumber(value: unknown): number {
  const amount = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function amountsDiffer(printed: number, summed: number): boolean {
  return Math.abs(printed - summed) > 0.05;
}

/**
 * Warns when the PDF footer subtotal does not match the carton rows.
 */
function subtotalWarnings(raw: unknown, cartons: PackingCarton[]): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const sub = raw as Record<string, unknown>;
  const checks: Array<[string, number, number]> = [
    ['count', asNumber(pick(sub, 'count')), cartons.reduce((sum, row) => sum + asNumber(row.count), 0)],
    ['net weight', asNumber(pick(sub, 'net_wt', 'netWeight')), cartons.reduce((sum, row) => sum + asNumber(row.netWeight), 0)],
    ['gross weight', asNumber(pick(sub, 'gross_wt', 'grossWeight')), cartons.reduce((sum, row) => sum + asNumber(row.grossWeight), 0)],
    ['total pcs', asNumber(pick(sub, 'total_pcs', 'totalPcs')), cartons.reduce((sum, row) => sum + asNumber(row.totalPcs), 0)],
    ['total qty', asNumber(pick(sub, 'total_qty', 'totalQty')), cartons.reduce((sum, row) => sum + asNumber(row.totalQty), 0)],
  ];
  return checks
    .filter(([, printed, summed]) => (printed !== 0 || summed !== 0) && amountsDiffer(printed, summed))
    .map(([label, printed, summed]) => `PDF subtotal ${label} is ${printed}. Carton rows sum to ${summed}.`);
}

/**
 * Maps a structured model payload. Accepts camelCase cartons or snake_case items.
 * Returns null when no VN carton rows were read.
 */
export function parsedPackingListFromModel(raw: unknown, fileName: string, confirmedMill: string): ParsedPackingList | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const rows = Array.isArray(body.cartons) ? body.cartons : Array.isArray(body.items) ? body.items : null;
  if (!rows) return null;
  const cartons = rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const materialCode = textOf(pick(item, 'materialCode', 'material_code'));
      const cartonNumber = textOf(pick(item, 'cartonNumber', 'carton_number')).toUpperCase().replace(/\s+/g, '');
      if (!/^VN\d{10,12}$/.test(cartonNumber)) return null;
      const uom = textOf(pick(item, 'uom'));
      return emptyCarton({
        materialCode,
        millSortKey: millOldSortKey(`${textOf(pick(item, 'millSortKey', 'mill_sort_key'))}\n${materialCode}`),
        cartonNumber,
        count: textOf(pick(item, 'count')),
        netWeight: textOf(pick(item, 'netWeight', 'net_wt')),
        grossWeight: textOf(pick(item, 'grossWeight', 'gross_wt')),
        totalPcs: textOf(pick(item, 'totalPcs', 'total_pcs')),
        totalQty: textOf(pick(item, 'totalQty', 'total_qty')),
        uom: uom.toUpperCase() === 'M' ? 'M' : uom,
        designShade: textOf(pick(item, 'designShade', 'design_shade')),
        product: textOf(pick(item, 'product')),
        batch: textOf(pick(item, 'batch')),
        finishWidth: textOf(pick(item, 'finishWidth', 'finish_width')),
        lotNumber: textOf(pick(item, 'lotNumber', 'lot')),
        size: textOf(pick(item, 'size')),
      });
    })
    .filter((row): row is PackingCarton => Boolean(row));
  if (!cartons.length) return null;
  const field = (...keys: string[]) => textOf(pick(body, ...keys));
  return {
    millName: confirmedMill.trim() || field('millName', 'mill_name'),
    consigneeName: field('consigneeName', 'consignee_name'),
    customerCity: field('customerCity', 'customer_city'),
    invoiceNumber: field('invoiceNumber', 'invoice_number'),
    invoiceDate: toIsoDate(field('invoiceDate', 'invoice_date')),
    orderNo: field('orderNo', 'order_no'),
    orderDate: toIsoDate(field('orderDate', 'order_date')),
    division: field('division'),
    lrNo: field('lrNo', 'lr_no'),
    lrDate: toIsoDate(field('lrDate', 'lr_date')),
    truckNo: field('truckNo', 'truck_no'),
    transporter: field('transporter'),
    packingNumber: packingNumberFromFile(fileName),
    cartons,
    warnings: subtotalWarnings(body.subtotal, cartons),
  };
}

function norm(value?: string): string {
  return (value || '').trim().toUpperCase();
}

function sameMill(left?: string, right?: string): boolean {
  const a = norm(millOldSortKey(left || '') || left);
  const b = norm(millOldSortKey(right || '') || right);
  return Boolean(a && b && a === b);
}

/** Fabric-master count name, such as 60COMPX60COMP. The leading digits alone are not the count. */
function fabricCountName(countName?: string): string {
  return String(countName || '').trim();
}

/** True when the carton count is only the leading digits of the fabric count name. */
function truncatedCount(count: string | undefined, countName: string): boolean {
  const leading = countName.match(/\d+(?:\.\d+)?/)?.[0] || '';
  return Boolean(leading && String(count || '').trim() === leading && leading !== countName);
}

function countMissing(count?: string): boolean {
  return !String(count || '').trim() || Number(count) === 0;
}

/**
 * When two fabrics share a mill key, the one already on a purchase-order line wins.
 */
function catalogForKey(catalogs: FabricMasterHit[], lines: PurchaseOrderLine[], key: string): FabricMasterHit | undefined {
  const matches = catalogs.filter((item) => sameMill(item.millOldFabricSortNo, key) || sameMill(item.millNewFabricSortNo, key));
  const onOrder = matches.find((item) => lines.some((line) => line.fabricId && String(line.fabricId) === String(item.id)));
  return onOrder || matches[0];
}

/**
 * Fills each carton from the fabric master when Mill Old or Mill New equals the mill sort key.
 * A blank or truncated count takes the fabric master's full count name, such as 60COMPX60COMP. A purchase-order line is selected only when its cutoff is already approved.
 */
export function enrichCartons(
  cartons: PackingCarton[],
  catalogs: FabricMasterHit[],
  lines: PurchaseOrderLine[],
  approvedKeys: Set<string>
): PackingCarton[] {
  const approvedLines = lines.filter((line) => approvedKeys.has(cutoffKey(line)));
  const onlyLine = approvedLines.length === 1 ? approvedLines[0] : undefined;
  return cartons.map((row) => {
    const key = norm(millOldSortKey(`${row.millSortKey}\n${row.materialCode}`) || row.millSortKey);
    const catalog = key ? catalogForKey(catalogs, lines, key) : undefined;
    const matched = lines.find((item) => {
      if (catalog?.id && item.fabricId && String(item.fabricId) === String(catalog.id)) return true;
      return key && (sameMill(item.millOldFabricSortNo, key) || sameMill(item.millNewFabricSortNo, key));
    });
    const line = matched || (!key ? onlyLine : undefined);
    const approved = Boolean(line && approvedKeys.has(cutoffKey(line)));
    const fromFabric = fabricCountName(catalog?.countName);
    const useFabricCount = Boolean(fromFabric && (countMissing(row.count) || truncatedCount(row.count, fromFabric)));
    return {
      ...row,
      millSortKey: key || row.millSortKey,
      fabricId: catalog?.id || line?.fabricId || '',
      fabricName: catalog?.name || line?.fabricName || '',
      fabricSortNo: catalog?.fabricSortNo || line?.fabricSortNo || '',
      millOldFabricSortNo: catalog?.millOldFabricSortNo || line?.millOldFabricSortNo || key || row.millSortKey || '',
      millNewFabricSortNo: catalog?.millNewFabricSortNo || line?.millNewFabricSortNo || '',
      fabricTypeName: catalog?.fabricTypeName || line?.fabricTypeName || '',
      colourName: catalog?.colourName || line?.colourName || '',
      count: useFabricCount ? fromFabric : row.count,
      lineId: approved && line ? line.lineId : '',
    };
  });
}

/** Count above 0, otherwise one roll for that carton so a zero-count PDF can still be reviewed. */
export function cartonRolls(cartons: PackingCarton[]): number {
  return cartons.reduce((sum, row) => sum + (Number(row.count) > 0 ? Number(row.count) : 1), 0);
}

export function cartonWeight(cartons: PackingCarton[]): number {
  return cartons.reduce((sum, row) => sum + (Number(row.grossWeight) || 0), 0);
}

export function cartonQuantity(cartons: PackingCarton[]): number {
  return cartons.reduce((sum, row) => sum + (Number(row.totalQty) || 0), 0);
}

export function cartonPayload(row: PackingCarton) {
  return {
    materialCode: row.materialCode,
    millSortKey: row.millSortKey,
    fabricId: row.fabricId || '',
    fabricName: row.fabricName || '',
    fabricSortNo: row.fabricSortNo || '',
    millOldFabricSortNo: row.millOldFabricSortNo || '',
    millNewFabricSortNo: row.millNewFabricSortNo || '',
    fabricTypeName: row.fabricTypeName || '',
    colourName: row.colourName || '',
    cartonNumber: row.cartonNumber,
    count: String(row.count || '').trim(),
    netWeight: Number(row.netWeight) || 0,
    grossWeight: Number(row.grossWeight) || 0,
    totalPcs: Number(row.totalPcs) || 0,
    totalQty: Number(row.totalQty) || 0,
    uom: row.uom,
    designShade: row.designShade,
    product: row.product,
    batch: row.batch,
    finishWidth: Number(row.finishWidth) || 0,
    lotNumber: row.lotNumber,
    size: row.size,
    extras: row.extras || [],
  };
}

/** Keeps rolls and weight equal to the carton rows. */
export function totalsFromCartons(cartons: PackingCarton[]): Pick<TransitPackEntry, 'rolls' | 'weight' | 'lineIds'> {
  const lineIds = Array.from(new Set(cartons.map((row) => row.lineId).filter((id): id is string => Boolean(id))));
  const weight = cartonWeight(cartons);
  return {
    rolls: String(cartonRolls(cartons)),
    weight: weight ? String(weight) : '0.00',
    lineIds,
  };
}
