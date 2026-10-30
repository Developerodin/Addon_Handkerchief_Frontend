/**
 * Downloads one purchase order as a two-sheet workbook named after the PO number.
 */

import { PurchaseOrderLine, PurchaseOrderRow, factoryRequest } from '@/shared/services/factoryApi';

/**
 * @param value - date-ish input
 * @returns DD/MM/YYYY, or empty when the value cannot be parsed
 */
function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB');
}

/**
 * File name safe for the browser download. Slashes in PO numbers become dashes.
 */
function fileNameFor(number: string): string {
  const safe = number.trim().replace(/[^\w.-]+/g, '-') || 'purchase-order';
  return `${safe}.xlsx`;
}

/**
 * One fabric line, plus the line amount.
 */
function lineRow(line: PurchaseOrderLine) {
  const quantity = Number(line.quantity) || 0;
  const rate = Number(line.rate) || 0;
  return {
    Fabric: line.fabricName || '',
    Type: line.fabricTypeName || '',
    Color: line.colourName || '',
    'Sort No': line.fabricSortNo || '',
    'Mill Old': line.millOldFabricSortNo || '',
    'Mill New': line.millNewFabricSortNo || '',
    Count: line.countName || '',
    Qty: quantity,
    Unit: line.unitName || '',
    Rate: rate,
    'GST %': Number(line.gstPercent) || 0,
    Amount: quantity * rate,
    'Est. delivery': formatDate(line.estimatedDelivery),
  };
}

/**
 * Loads the order and writes `{po-number}.xlsx`.
 * @returns the downloaded file name
 * @throws when the order cannot be loaded
 */
export async function downloadOnePurchaseOrderExcel(orderId: string): Promise<string> {
  const order = await factoryRequest<PurchaseOrderRow>(`/store/purchase-orders/${orderId}`);
  const XLSX = await import('xlsx');
  const lines = (order.lines || []).map(lineRow);
  const totalQty = lines.reduce((sum, row) => sum + Number(row.Qty), 0);
  const totalAmount = lines.reduce((sum, row) => sum + Number(row.Amount), 0);
  const header = [
    ['PO number', order.number || ''],
    ['Supplier', order.supplierName || ''],
    ['Address', order.supplierAddress || ''],
    ['Order date', formatDate(order.purchaseDate)],
    ['Expected delivery', formatDate(order.estimatedDelivery)],
    ['Credit days', order.creditDays ?? 0],
    ['Status', order.status || ''],
    ['Notes', order.notes || ''],
  ];
  const lineSheet = lines.length
    ? XLSX.utils.json_to_sheet(lines)
    : XLSX.utils.aoa_to_sheet([['Fabric', 'Type', 'Color', 'Sort No', 'Mill Old', 'Mill New', 'Count', 'Qty', 'Unit', 'Rate', 'GST %', 'Amount', 'Est. delivery']]);
  if (lines.length) {
    XLSX.utils.sheet_add_aoa(
      lineSheet,
      [['Total', '', '', '', '', '', '', totalQty, '', '', '', totalAmount, '']],
      { origin: -1 }
    );
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(header), 'Order');
  XLSX.utils.book_append_sheet(book, lineSheet, 'Lines');
  const name = fileNameFor(order.number || '');
  XLSX.writeFile(book, name);
  return name;
}
