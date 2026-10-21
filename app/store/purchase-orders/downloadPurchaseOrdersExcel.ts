import { factoryPage, PurchaseOrderRow } from '@/shared/services/factoryApi';

/**
 * Maps purchase orders to the Excel columns used by the list download.
 */
function toSheetRows(rows: PurchaseOrderRow[]) {
  return rows.map((row) => ({
    'PO number': row.number,
    Supplier: row.supplierName,
    'Order date': row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString('en-GB') : '',
    'Expected delivery': row.estimatedDelivery ? new Date(row.estimatedDelivery).toLocaleDateString('en-GB') : '',
    Status: row.status,
    Ordered: (row.lines || []).reduce((sum, line) => sum + (line.quantity || 0), 0),
  }));
}

/**
 * Writes the given purchase orders to purchase-orders.xlsx.
 */
export async function downloadPurchaseOrderRowsExcel(rows: PurchaseOrderRow[]): Promise<number> {
  if (rows.length === 0) {
    throw new Error('No purchase orders to export');
  }

  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(toSheetRows(rows)), 'Purchase orders');
  XLSX.writeFile(book, 'purchase-orders.xlsx');
  return rows.length;
}

/**
 * Loads every purchase order matching the current filters and downloads them as Excel.
 */
export async function downloadPurchaseOrdersExcel(query: {
  status: string;
  from: string;
  to: string;
  search: string;
}): Promise<number> {
  const rows: PurchaseOrderRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await factoryPage<PurchaseOrderRow>('/store/purchase-orders', page, 100, query.search, {
      status: query.status,
      from: query.from,
      to: query.to,
      excludeDraft: '1',
    });
    rows.push(...(data.results || []));
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages && page <= 50);

  return downloadPurchaseOrderRowsExcel(rows);
}
