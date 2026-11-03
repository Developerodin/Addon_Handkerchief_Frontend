import {
  ConsumptionActivity,
  ConsumptionBand,
  ConsumptionDay,
  ConsumptionFabric,
  ConsumptionOrder,
  ConsumptionReport,
  ConsumptionSelection,
  ConsumptionTotals,
} from './consumptionTypes';

const EMPTY_TOTALS: ConsumptionTotals = {
  bomMeters: 0,
  issuedMeters: 0,
  returnedMeters: 0,
  consumedMeters: 0,
  varianceMeters: 0,
  issuedRolls: 0,
  returnedRolls: 0,
  band: 'match',
  orders: 0,
  fabrics: 0,
  overCount: 0,
  underCount: 0,
  matchCount: 0,
};

/**
 * Over, short, or on the BOM. Match is within a thousandth of a metre.
 * @param variance - Issued metres minus BOM metres
 */
export function bandOf(variance: number): ConsumptionBand {
  if (variance > 0.001) return 'over';
  if (variance < -0.001) return 'under';
  return 'match';
}

/**
 * Three-decimal quantity, matching the API.
 * @param value - Metre or roll count
 */
function round3(value: number): number {
  return Math.round((value || 0) * 1000) / 1000;
}

/**
 * Selected fabric, by catalog id or by the name on the card.
 * @param row - Order fabric row
 * @param selection - Current query
 * @param enabled - False when the fabric cards themselves are being built
 */
function fabricChosen(row: ConsumptionOrder, selection: ConsumptionSelection, enabled: boolean): boolean {
  if (!enabled || (!selection.fabric && !selection.fabricId)) return true;
  const nameOk = Boolean(selection.fabric) && row.fabricName.toLowerCase() === selection.fabric.toLowerCase();
  const idOk = Boolean(selection.fabricId) && row.fabricCatalogId === selection.fabricId;
  return nameOk || idOk;
}

/**
 * Search matches the order number, fabric, or buyer.
 * @param row - Order fabric row
 * @param query - Search box text
 */
function matchesQuery(row: ConsumptionOrder, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${row.orderNumber} ${row.fabricName} ${row.buyer}`.toLowerCase().includes(needle);
}

/**
 * Replaces issued metres with that day's movements. BOM stays the full order.
 * @param row - Order fabric row
 * @param activity - Per-day metres
 * @param day - Selected YYYY-MM-DD, or blank
 */
function sliceRow(row: ConsumptionOrder, activity: ConsumptionActivity[], day: string): ConsumptionOrder {
  if (!day) return row;
  const hits = activity.filter((item) => item.date === day && item.orderId === row.orderId && item.fabricName === row.fabricName);
  const issuedMeters = round3(hits.reduce((sum, item) => sum + item.issuedMeters, 0));
  const returnedMeters = round3(hits.reduce((sum, item) => sum + item.returnedMeters, 0));
  const consumedMeters = round3(issuedMeters - returnedMeters);
  const varianceMeters = round3(issuedMeters - row.bomMeters);
  return {
    ...row,
    issuedMeters,
    returnedMeters,
    consumedMeters,
    issuedRolls: hits.reduce((sum, item) => sum + item.issuedRolls, 0),
    returnedRolls: hits.reduce((sum, item) => sum + item.returnedRolls, 0),
    varianceMeters,
    band: bandOf(varianceMeters),
  };
}

/**
 * Order rows after search, fabric, day, and optional band.
 * @param report - Full payload for the date range
 * @param selection - Query string selection
 * @param opts - Which parts of the selection apply
 */
export function scopedOrders(
  report: ConsumptionReport,
  selection: ConsumptionSelection,
  opts: { fabric?: boolean; band?: boolean } = {}
): ConsumptionOrder[] {
  const useFabric = opts.fabric !== false;
  const useBand = opts.band !== false;
  return report.orders
    .filter((row) => fabricChosen(row, selection, useFabric) && matchesQuery(row, selection.query))
    .filter((row) => !selection.day || row.activeDays.includes(selection.day))
    .map((row) => sliceRow(row, report.activity, selection.day))
    .filter((row) => !useBand || !selection.band || row.band === selection.band);
}

/**
 * KPI numbers. An unfiltered view uses the API totals so rounding stays put.
 * @param report - Full payload for the date range
 * @param selection - Query string selection
 */
export function viewTotals(report: ConsumptionReport, selection: ConsumptionSelection): ConsumptionTotals {
  const narrowed = Boolean(selection.day || selection.fabric || selection.fabricId || selection.query.trim());
  if (!narrowed) return report.totals;
  const rows = scopedOrders(report, selection, { fabric: true, band: false });
  if (!rows.length) return EMPTY_TOTALS;
  const orders = new Set<string>();
  const fabrics = new Set<string>();
  const sum = rows.reduce(
    (totals, row) => {
      orders.add(row.orderId);
      fabrics.add(row.fabricName.toLowerCase());
      if (row.band === 'over') totals.overCount += 1;
      else if (row.band === 'under') totals.underCount += 1;
      else totals.matchCount += 1;
      totals.bomMeters += row.bomMeters;
      totals.issuedMeters += row.issuedMeters;
      totals.returnedMeters += row.returnedMeters;
      totals.issuedRolls += row.issuedRolls;
      totals.returnedRolls += row.returnedRolls;
      return totals;
    },
    { ...EMPTY_TOTALS }
  );
  const issuedMeters = round3(sum.issuedMeters);
  const returnedMeters = round3(sum.returnedMeters);
  const bomMeters = round3(sum.bomMeters);
  const varianceMeters = round3(issuedMeters - bomMeters);
  return {
    ...sum,
    bomMeters,
    issuedMeters,
    returnedMeters,
    consumedMeters: round3(issuedMeters - returnedMeters),
    varianceMeters,
    band: bandOf(varianceMeters),
    orders: orders.size,
    fabrics: fabrics.size,
  };
}

/**
 * Fabric cards. The selected fabric stays in the list so it can be cleared.
 * @param report - Full payload for the date range
 * @param selection - Query string selection
 */
export function viewFabrics(report: ConsumptionReport, selection: ConsumptionSelection): ConsumptionFabric[] {
  if (!selection.day && !selection.query.trim()) return report.fabrics;
  const grouped = new Map<string, ConsumptionFabric & { orderIds: Set<string> }>();
  scopedOrders(report, selection, { fabric: false, band: false }).forEach((row) => {
    const key = row.fabricName.toLowerCase() || row.fabricCatalogId || 'unnamed';
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...row, orders: 0, orderIds: new Set([row.orderId]), missingBom: row.missingBom });
      return;
    }
    current.orderIds.add(row.orderId);
    current.bomMeters = round3(current.bomMeters + row.bomMeters);
    current.issuedMeters = round3(current.issuedMeters + row.issuedMeters);
    current.returnedMeters = round3(current.returnedMeters + row.returnedMeters);
    current.issuedRolls += row.issuedRolls;
    current.returnedRolls += row.returnedRolls;
    if (!current.fabricCatalogId && row.fabricCatalogId) current.fabricCatalogId = row.fabricCatalogId;
    if (!row.missingBom) current.missingBom = false;
  });
  return Array.from(grouped.values())
    .map((row) => {
      const varianceMeters = round3(row.issuedMeters - row.bomMeters);
      return {
        ...row,
        orders: row.orderIds.size,
        consumedMeters: round3(row.issuedMeters - row.returnedMeters),
        varianceMeters,
        band: bandOf(varianceMeters),
      };
    })
    .sort((a, b) => b.varianceMeters - a.varianceMeters || a.fabricName.localeCompare(b.fabricName));
}

/**
 * Day bars. A fabric or search narrows which orders feed each day.
 * @param report - Full payload for the date range
 * @param selection - Query string selection
 */
export function viewDays(report: ConsumptionReport, selection: ConsumptionSelection): ConsumptionDay[] {
  if (!selection.fabric && !selection.fabricId && !selection.query.trim()) return report.days;
  const allowed = new Set(
    report.orders
      .filter((row) => fabricChosen(row, selection, true) && matchesQuery(row, selection.query))
      .map((row) => `${row.orderId}::${row.fabricName}`)
  );
  const days = new Map<string, ConsumptionDay & { orders: Set<string> }>();
  report.activity.forEach((item) => {
    if (!allowed.has(`${item.orderId}::${item.fabricName}`)) return;
    const current = days.get(item.date);
    if (!current) {
      days.set(item.date, {
        date: item.date,
        issuedMeters: item.issuedMeters,
        returnedMeters: item.returnedMeters,
        consumedMeters: 0,
        issuedRolls: item.issuedRolls,
        orderCount: 0,
        orders: new Set([item.orderId]),
      });
      return;
    }
    current.issuedMeters += item.issuedMeters;
    current.returnedMeters += item.returnedMeters;
    current.issuedRolls += item.issuedRolls;
    current.orders.add(item.orderId);
  });
  return Array.from(days.values())
    .map((day) => ({
      date: day.date,
      issuedMeters: round3(day.issuedMeters),
      returnedMeters: round3(day.returnedMeters),
      consumedMeters: round3(day.issuedMeters - day.returnedMeters),
      issuedRolls: day.issuedRolls,
      orderCount: day.orders.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Order table rows, including the variance band.
 * @param report - Full payload for the date range
 * @param selection - Query string selection
 */
export function viewOrders(report: ConsumptionReport, selection: ConsumptionSelection): ConsumptionOrder[] {
  return scopedOrders(report, selection, { fabric: true, band: true });
}
