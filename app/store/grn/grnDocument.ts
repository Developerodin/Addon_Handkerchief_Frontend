import { PurchaseOrderLine, PurchaseOrderRow, ReceiptRow, ReceivedLot, RollRow } from '@/shared/services/factoryApi';
import { listFabricSuppliers, FabricSupplier } from '@/shared/services/fabricSupplierService';
import { downloadGrnHtml, GrnSnapshot, GrnSnapshotItem, GrnSnapshotLot, printGrnDocument } from '@/shared/utils/grnPrint';

const HOME_STATES = new Set(['maharashtra', 'mh']);

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/**
 * Integer rupees in Indian grouping words.
 */
function rupeesInWords(num: number): string {
  const value = Math.floor(Math.abs(num));
  if (value === 0) return 'Zero Rupees';
  const two = (part: number) => (part < 20 ? ONES[part] : `${TENS[Math.floor(part / 10)]}${part % 10 ? ` ${ONES[part % 10]}` : ''}`);
  const three = (part: number) => {
    const hundreds = Math.floor(part / 100);
    const rest = part % 100;
    return `${hundreds ? `${ONES[hundreds]} Hundred${rest ? ' ' : ''}` : ''}${rest ? two(rest) : ''}`;
  };
  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value / 100000) % 100);
  const thousand = Math.floor((value / 1000) % 100);
  const rest = value % 1000;
  return `${[crore ? `${two(crore)} Crore` : '', lakh ? `${two(lakh)} Lakh` : '', thousand ? `${two(thousand)} Thousand` : '', rest ? three(rest) : ''].filter(Boolean).join(' ')} Rupees`;
}

/**
 * Grand total as "Rupees … Only", including paise when present.
 */
function amountInWords(grandTotal: number): string {
  const rupees = Math.floor(grandTotal);
  const paise = Math.round((grandTotal - rupees) * 100);
  if (paise <= 0) return `${rupeesInWords(rupees)} Only`;
  return `${rupeesInWords(rupees)} and ${rupeesInWords(paise).replace(' Rupees', '')} Paise Only`;
}

/**
 * Received metres (or the PO unit) grouped by purchase-order line.
 */
function itemsFromOrder(order: PurchaseOrderRow): GrnSnapshotItem[] {
  const received = new Map<string, number>();
  (order.receivedLots || []).forEach((lot) => {
    (lot.lines || []).forEach((line) => {
      received.set(line.lineId, (received.get(line.lineId) || 0) + (Number(line.receivedQuantity) || 0));
    });
  });
  return [...received.entries()].map(([lineId, quantity]) => lineItem(order.lines.find((row) => row.lineId === lineId), quantity));
}

/**
 * One printable line. Falls back to the fabric name when the PO line is missing.
 */
function lineItem(line: PurchaseOrderLine | undefined, quantity: number): GrnSnapshotItem {
  const rate = Number(line?.rate) || 0;
  return {
    yarnName: line?.fabricName || 'Fabric',
    sizeCount: line?.fabricSortNo || '',
    shadeCode: line?.colourName || '',
    quantity,
    rate,
    amount: quantity * rate,
    gstRate: Number(line?.gstPercent) || 0,
    unit: line?.unitName || 'MTR',
  };
}

/**
 * Rolls grouped by fabric when the PO has no received quantities.
 */
function itemsFromRolls(rolls: RollRow[]): GrnSnapshotItem[] {
  const groups = new Map<string, { name: string; shade: string; qty: number; rate: number; gst: number }>();
  rolls.forEach((roll) => {
    const key = `${roll.fabricName || ''}|${roll.colourName || ''}|${roll.rate || 0}`;
    const current = groups.get(key) || { name: roll.fabricName || 'Fabric', shade: roll.colourName || '', qty: 0, rate: Number(roll.rate) || 0, gst: Number(roll.gstPercent) || 0 };
    current.qty += Number(roll.netWeight) > 0 ? Number(roll.netWeight) : 1;
    groups.set(key, current);
  });
  return [...groups.values()].map((group) => ({
    yarnName: group.name,
    shadeCode: group.shade,
    quantity: group.qty,
    rate: group.rate,
    amount: group.qty * group.rate,
    gstRate: group.gst,
    unit: Number(rolls[0]?.netWeight) > 0 ? 'KGS' : 'NOS',
  }));
}

/**
 * Lot strip: roll count, gross, and net. PO lots win; otherwise rolls are grouped.
 */
function buildLots(order: PurchaseOrderRow | null, rolls: RollRow[]): GrnSnapshotLot[] {
  if (order?.receivedLots?.length) return order.receivedLots.map(lotRow);
  const groups = new Map<string, GrnSnapshotLot>();
  rolls.forEach((roll) => {
    const key = roll.receivedLotNumber || '—';
    const current = groups.get(key) || { lotNumber: key, numberOfCones: 0, totalWeight: 0, netWeight: 0, numberOfBoxes: 0 };
    current.numberOfCones += 1;
    current.totalWeight += Number(roll.grossWeight) || 0;
    current.netWeight = (current.netWeight || 0) + (Number(roll.netWeight) || 0);
    groups.set(key, current);
  });
  return [...groups.values()];
}

/**
 * One received lot mapped onto the print lot row.
 */
function lotRow(lot: ReceivedLot): GrnSnapshotLot {
  return {
    lotNumber: lot.lotNumber,
    numberOfCones: Number(lot.rolls) || 0,
    totalWeight: Number(lot.grossWeight) || 0,
    netWeight: Number(lot.netWeight) || 0,
    numberOfBoxes: 0,
  };
}

/**
 * Same-state suppliers split GST into SGST + CGST. Everyone else is IGST.
 */
function sameState(supplier: FabricSupplier | null): boolean {
  const state = (supplier?.state || '').trim().toLowerCase();
  if (HOME_STATES.has(state)) return true;
  return (supplier?.gstin || '').trim().toUpperCase().startsWith('27');
}

/**
 * Basic value, GST split, and rounded grand total for the template footer.
 */
function totalsFor(items: GrnSnapshotItem[], supplier: FabricSupplier | null) {
  const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const avgGst = items.length ? items.reduce((sum, item) => sum + (item.gstRate || 0), 0) / items.length : 0;
  const gst = (subTotal * avgGst) / 100;
  const local = sameState(supplier);
  const preRound = subTotal + gst;
  const roundOff = Math.round(preRound) - preRound;
  const grandTotal = preRound + roundOff;
  return {
    subTotal,
    taxableValue: subTotal,
    discountAmount: 0,
    freightAmount: 0,
    freightGst: 0,
    roundOff,
    sgst: local ? gst / 2 : 0,
    cgst: local ? gst / 2 : 0,
    igst: local ? 0 : gst,
    grandTotal,
    totalQty,
    taxLabel: local ? `GST ${avgGst.toFixed(1)}%` : `IGST ${avgGst.toFixed(1)}%`,
    amountInWords: amountInWords(grandTotal),
  };
}

/**
 * Looks up the fabric supplier so GST, phone, and address print. Missing supplier still prints.
 */
async function loadSupplier(name?: string): Promise<FabricSupplier | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  try {
    const page = await listFabricSuppliers({ name: trimmed, limit: 10 });
    return page.results.find((row) => row.name.trim().toLowerCase() === trimmed.toLowerCase()) || null;
  } catch (err) {
    console.error('GRN print could not load supplier', err);
    return null;
  }
}

/**
 * Fabric receipt mapped onto the yarn GRN print snapshot.
 */
function buildSnapshot(grn: ReceiptRow, rolls: RollRow[], order: PurchaseOrderRow | null, supplier: FabricSupplier | null): GrnSnapshot {
  const items = order && order.receivedLots?.some((lot) => (lot.lines || []).length) ? itemsFromOrder(order) : itemsFromRolls(rolls);
  const street = supplier?.address || grn.supplierAddress || order?.supplierAddress || '';
  const pin = supplier?.pincode ? ` ${supplier.pincode}` : '';
  return {
    grnNumber: grn.number,
    grnDate: grn.receivedDate || new Date().toISOString(),
    poNumber: order?.number || grn.poId,
    poDate: order?.purchaseDate || null,
    notes: grn.notes || '',
    discrepancyDetails: grn.condition || '',
    supplier: {
      name: supplier?.name || grn.supplierName || '',
      address: `${street}${pin}`.trim(),
      city: supplier?.city || '',
      state: supplier?.state || '',
      email: supplier?.email || '',
      contactNumber: supplier?.contactNumber || '',
      gstNo: supplier?.gstin || '',
    },
    lots: buildLots(order, rolls),
    items,
    totals: totalsFor(items, supplier),
  };
}

/**
 * Prints the goods-received-note template for this fabric GRN.
 */
export async function printFabricGrn(grn: ReceiptRow, rolls: RollRow[], order: PurchaseOrderRow | null): Promise<void> {
  const supplier = await loadSupplier(grn.supplierName);
  await printGrnDocument(buildSnapshot(grn, rolls, order, supplier));
}

/**
 * Downloads the same filled goods-received-note HTML.
 */
export async function downloadFabricGrn(grn: ReceiptRow, rolls: RollRow[], order: PurchaseOrderRow | null): Promise<void> {
  const supplier = await loadSupplier(grn.supplierName);
  await downloadGrnHtml(buildSnapshot(grn, rolls, order, supplier));
}
