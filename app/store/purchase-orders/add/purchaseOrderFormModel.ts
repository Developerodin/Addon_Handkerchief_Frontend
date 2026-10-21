import { newLineId } from '@/shared/services/factoryApi';
import { FabricCatalog, getLookupName } from '@/shared/services/fabricCatalogService';
import { FabricSupplier } from '@/shared/services/fabricSupplierService';
import { FabricMeasurementLookup } from '@/shared/services/fabricLookupService';

export interface FabricPoLine {
  lineId: string;
  query: string;
  fabricId: string;
  fabricName: string;
  fabricTypeName: string;
  colourName: string;
  quantity: string;
  unitId: string;
  unitName: string;
  rate: string;
  gstPercent: string;
  estimatedDelivery: string;
  unmatched: boolean;
}

export interface PoFormValues {
  purchaseDate: string;
  supplierId: string;
  creditDays: string;
  estimatedDelivery: string;
  notes: string;
  lines: FabricPoLine[];
}

export interface PoSavePayload {
  supplierName: string;
  supplierAddress: string;
  supplierTerms: string;
  purchaseDate: string;
  creditDays: number;
  estimatedDelivery: string | null;
  notes: string;
  replaceLines: true;
  lines: Array<{
    lineId: string;
    fabricId?: string;
    fabricName: string;
    fabricTypeName: string;
    colourName: string;
    quantity: number;
    unitId?: string;
    unitName: string;
    rate: number;
    gstPercent: number;
    estimatedDelivery: string | null;
  }>;
}

/**
 * Local calendar date as YYYY-MM-DD.
 */
export function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * GST on the fabric catalog is stored as "5" or "5%".
 */
export function gstNumber(value: unknown): string {
  const parsed = parseFloat(String(value ?? '').replace('%', ''));
  return Number.isFinite(parsed) ? String(parsed) : '';
}

/**
 * Pulls the first number out of a payment-terms string such as "30 days".
 */
export function creditDaysFromTerms(terms?: string): number {
  const match = String(terms || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/** Fabric type label from the catalog row. */
export function fabricTypeLabel(fabric: FabricCatalog): string {
  return fabric.fabricTypeName || getLookupName(fabric.fabricType);
}

/** Fabric colour label from the catalog row. */
export function fabricColorLabel(fabric: FabricCatalog): string {
  return fabric.colourName || getLookupName(fabric.color);
}

/**
 * Blank line. Delivery is copied from the order date when that is already set.
 */
export function emptyLine(estimatedDelivery = ''): FabricPoLine {
  return {
    lineId: newLineId(),
    query: '',
    fabricId: '',
    fabricName: '',
    fabricTypeName: '',
    colourName: '',
    quantity: '',
    unitId: '',
    unitName: '',
    rate: '',
    gstPercent: '',
    estimatedDelivery,
    unmatched: false,
  };
}

/**
 * Fabrics this supplier can sell. An empty link list falls back to the full catalog.
 */
export function fabricsForSupplier(fabrics: FabricCatalog[], supplier?: FabricSupplier): FabricCatalog[] {
  const linked = (supplier?.fabricDetails || [])
    .map((detail) => {
      const value = detail.fabricCatalogId as unknown;
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value && 'id' in value) return String((value as { id?: string }).id || '');
      return '';
    })
    .filter(Boolean);
  const active = fabrics.filter((fabric) => fabric.status !== 'inactive');
  if (!linked.length) return active;
  return active.filter((fabric) => linked.includes(fabric.id));
}

/**
 * Name, type, and colour search. Empty query returns the first page of options.
 */
export function filterFabrics(fabrics: FabricCatalog[], query: string): FabricCatalog[] {
  const needle = query.trim().toLowerCase();
  const rows = needle
    ? fabrics.filter((fabric) => {
        const haystack = [fabric.name, fabricTypeLabel(fabric), fabricColorLabel(fabric)].join(' ').toLowerCase();
        return haystack.includes(needle);
      })
    : fabrics;
  return rows.slice(0, 20);
}

/**
 * Accepts a decimal string. Returns null when the keystroke should be ignored.
 */
export function decimalInput(value: string, max?: number): string | null {
  if (value !== '' && !/^\d*\.?\d*$/.test(value)) return null;
  if (max == null || value === '' || value === '.' || value.endsWith('.')) return value;
  return Number(value) <= max ? value : null;
}

/** A line the user has started typing into. */
export function lineHasContent(line: FabricPoLine): boolean {
  return Boolean(
    line.query.trim() ||
      line.fabricId ||
      line.quantity.trim() ||
      line.unitId ||
      line.rate.trim() ||
      line.gstPercent.trim() ||
      line.estimatedDelivery
  );
}

/**
 * Field errors for draft save or raise. Empty object means the form can be sent.
 */
export function validatePoForm(values: PoFormValues, mode: 'draft' | 'raise'): Record<string, string> {
  const issues: Record<string, string> = {};
  if (!values.purchaseDate) issues.purchaseDate = 'Purchase date is required';
  if (!values.supplierId) issues.supplier = 'Supplier is required';
  const credit = Number(values.creditDays);
  if (values.creditDays.trim() === '' || Number.isNaN(credit) || credit < 0) {
    issues.creditDays = 'Credit days is required';
  }
  const active = values.lines.filter(lineHasContent);
  if (mode === 'raise' && !values.estimatedDelivery) {
    issues.estimatedDelivery = 'Estimated order delivery date is required';
  }
  if (mode === 'raise' && active.length === 0) {
    issues.items = 'At least one fabric item is required';
  }
  active.forEach((line, index) => validateLine(line, index + 1, mode, issues));
  return issues;
}

/**
 * Checks one fabric row. Raise requires rate, quantity, GST, and a delivery date.
 */
function validateLine(line: FabricPoLine, index: number, mode: 'draft' | 'raise', issues: Record<string, string>) {
  if (!line.fabricId) issues[`fabric-${line.lineId}`] = `Item ${index} is not matched to a fabric`;
  const qty = Number(line.quantity);
  if (line.quantity !== '' && (Number.isNaN(qty) || qty < 0)) {
    issues[`qty-${line.lineId}`] = `Quantity is invalid for item ${index}`;
  }
  if (mode !== 'raise') return;
  if (!(qty > 0)) issues[`qty-${line.lineId}`] = `Quantity must be greater than 0 for item ${index}`;
  if (!line.unitId) issues[`unit-${line.lineId}`] = `Unit is required for item ${index}`;
  if (!(Number(line.rate) > 0)) issues[`rate-${line.lineId}`] = `Rate must be greater than 0 for item ${index}`;
  const gst = Number(line.gstPercent);
  if (line.gstPercent.trim() === '' || Number.isNaN(gst) || gst < 0 || gst > 100) {
    issues[`gst-${line.lineId}`] = `GST must be between 0 and 100 for item ${index}`;
  }
  if (!line.estimatedDelivery) issues[`delivery-${line.lineId}`] = `Estimated delivery is required for item ${index}`;
}

/** First validation message, for the alert and the toast. */
export function firstIssue(issues: Record<string, string>): string {
  return Object.values(issues).find((message) => message.trim()) || '';
}

/**
 * Builds the API body from the form. Blank rows are left out.
 */
export function toPoPayload(
  values: PoFormValues,
  supplier: { name: string; address: string; terms: string }
): PoSavePayload {
  const lines = values.lines.filter(lineHasContent).map((line) => ({
    lineId: line.lineId,
    fabricId: line.fabricId || undefined,
    fabricName: line.fabricName || line.query.trim(),
    fabricTypeName: line.fabricTypeName,
    colourName: line.colourName,
    quantity: Number(line.quantity || 0),
    unitId: line.unitId || undefined,
    unitName: line.unitName,
    rate: Number(line.rate || 0),
    gstPercent: Number(line.gstPercent || 0),
    estimatedDelivery: line.estimatedDelivery || null,
  }));
  return {
    supplierName: supplier.name,
    supplierAddress: supplier.address,
    supplierTerms: supplier.terms,
    purchaseDate: values.purchaseDate,
    creditDays: Number(values.creditDays || 0),
    estimatedDelivery: values.estimatedDelivery || null,
    notes: values.notes.trim(),
    replaceLines: true,
    lines,
  };
}

/** Subtotal, GST amount, and grand total for the lines that have numbers. */
export function poTotals(lines: FabricPoLine[]) {
  return lines.reduce(
    (sum, line) => {
      const qty = Number(line.quantity) || 0;
      const rate = Number(line.rate) || 0;
      const gst = Number(line.gstPercent) || 0;
      const sub = qty * rate;
      const gstAmount = (sub * gst) / 100;
      return {
        qty: sum.qty + qty,
        sub: sum.sub + sub,
        gst: sum.gst + gstAmount,
        total: sum.total + sub + gstAmount,
      };
    },
    { qty: 0, sub: 0, gst: 0, total: 0 }
  );
}

/** Indian grouping with two decimals. */
export function formatInr(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Two-decimal quantity for the totals row. */
export function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Picks one catalog row from an imported name, type, and colour.
 */
export function matchFabric(
  fabrics: FabricCatalog[],
  row: { fabricName: string; fabricTypeName: string; colourName: string }
): FabricCatalog | undefined {
  const name = row.fabricName.trim().toLowerCase();
  if (!name) return undefined;
  const named = fabrics.filter((fabric) => fabric.name.trim().toLowerCase() === name);
  if (named.length <= 1) return named[0];
  const narrowed = named.filter((fabric) => {
    const typeOk = !row.fabricTypeName || fabricTypeLabel(fabric).toLowerCase() === row.fabricTypeName.trim().toLowerCase();
    const colorOk = !row.colourName || fabricColorLabel(fabric).toLowerCase() === row.colourName.trim().toLowerCase();
    return typeOk && colorOk;
  });
  return narrowed.length === 1 ? narrowed[0] : undefined;
}

/** Dropdown label for a fabric measurement, including its symbol. */
export function measurementLabel(row: Pick<FabricMeasurementLookup, 'name' | 'symbol'>): string {
  const name = String(row.name || '').trim();
  const symbol = String(row.symbol || '').trim();
  if (symbol && symbol.toLowerCase() !== name.toLowerCase()) return `${name} (${symbol})`;
  return name;
}

export interface PoFormSeed {
  purchaseDate: string;
  supplierId: string;
  supplierQuery: string;
  supplierAddress: string;
  supplierTerms: string;
  creditDays: string;
  estimatedDelivery: string;
  notes: string;
  lines: FabricPoLine[];
}

/**
 * Local calendar date from an API timestamp.
 */
function isoDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * Maps a saved purchase order onto the add-form fields.
 */
export function formSeedFromOrder(
  order: {
    supplierName: string;
    supplierAddress?: string;
    supplierTerms?: string;
    purchaseDate?: string;
    creditDays?: number;
    estimatedDelivery?: string;
    notes?: string;
    lines?: Array<{
      lineId: string;
      fabricId?: string;
      fabricName?: string;
      fabricTypeName?: string;
      colourName?: string;
      quantity: number;
      unitId?: string;
      unitName?: string;
      rate?: number;
      gstPercent?: number;
      estimatedDelivery?: string;
    }>;
  },
  suppliers: FabricSupplier[],
  units: FabricMeasurementLookup[]
): PoFormSeed {
  const supplier = suppliers.find((row) => row.name.trim().toLowerCase() === order.supplierName.trim().toLowerCase());
  return {
    purchaseDate: isoDate(order.purchaseDate) || todayIso(),
    supplierId: supplier?.id || '',
    supplierQuery: order.supplierName || '',
    supplierAddress: order.supplierAddress || '',
    supplierTerms: order.supplierTerms || supplier?.paymentTerms || '',
    creditDays: String(order.creditDays ?? creditDaysFromTerms(order.supplierTerms || supplier?.paymentTerms)),
    estimatedDelivery: isoDate(order.estimatedDelivery),
    notes: order.notes || '',
    lines: (order.lines || []).map((line) => {
      const unit = units.find((row) => row.id === line.unitId) || matchMeasurement(units, line.unitName || '');
      return {
        lineId: line.lineId,
        query: line.fabricName || '',
        fabricId: line.fabricId || '',
        fabricName: line.fabricName || '',
        fabricTypeName: line.fabricTypeName || '',
        colourName: line.colourName || '',
        quantity: line.quantity != null ? String(line.quantity) : '',
        unitId: unit?.id || line.unitId || '',
        unitName: unit ? measurementLabel(unit) : line.unitName || '',
        rate: line.rate != null ? String(line.rate) : '',
        gstPercent: line.gstPercent != null ? String(line.gstPercent) : '',
        estimatedDelivery: isoDate(line.estimatedDelivery),
        unmatched: Boolean(line.fabricName) && !line.fabricId,
      };
    }),
  };
}

/**
 * Matches an imported unit against the fabric measurement master by name or symbol.
 */
export function matchMeasurement(rows: FabricMeasurementLookup[], value: string): FabricMeasurementLookup | undefined {
  const needle = value.trim().toLowerCase();
  if (!needle) return undefined;
  return rows.find((row) => {
    const name = row.name.trim().toLowerCase();
    const symbol = String(row.symbol || '').trim().toLowerCase();
    return needle === name || needle === symbol || needle === measurementLabel(row).toLowerCase();
  });
}
