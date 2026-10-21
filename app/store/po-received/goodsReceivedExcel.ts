import { PurchaseOrderRow } from '@/shared/services/factoryApi';
import { receivedForLine, GoodsReceivedLotDraft } from './goodsReceivedModel';

/**
 * Downloads the order lines and the quantities entered in the open drawer.
 */
export async function downloadGoodsReceivedExcel(order: PurchaseOrderRow, lots: GoodsReceivedLotDraft[]): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = (order.lines || []).map((line) => ({
    'Fabric name': line.fabricName || '',
    Type: line.fabricTypeName || '',
    Color: line.colourName || '',
    Quantity: line.quantity || 0,
    Unit: line.unitName || '',
    'Qty received': receivedForLine(lots, line.lineId),
    Rate: line.rate || 0,
  }));
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, 'Order items');
  XLSX.writeFile(book, `${order.number}-goods-received.xlsx`);
}
