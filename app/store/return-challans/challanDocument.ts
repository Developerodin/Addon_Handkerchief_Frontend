import { VendorReturnRow } from '@/shared/services/factoryApi';
import { escapeHtml } from '@/shared/utils/printHtmlDocument';

/**
 * Printable body for one return challan.
 */
export function challanBody(row: VendorReturnRow): string {
  const rolls = (row.rollBarcodes || []).map((code) => `<tr><td>${escapeHtml(code)}</td></tr>`).join('');
  return `
    <h1>Return challan ${escapeHtml(row.challanNumber || row.id)}</h1>
    <p>PO ${escapeHtml(row.poNumber || row.poId)}</p>
    <p>Supplier ${escapeHtml(row.supplierName || '—')}</p>
    <p>Reason ${escapeHtml(row.reason)}</p>
    <p>Lots ${escapeHtml((row.lotNumbers || []).join(', ') || '—')}</p>
    <p>Remarks ${escapeHtml(row.remarks || '—')}</p>
    <p>Quantity ${row.quantity ?? row.rollBarcodes.length} · Weight ${row.weight ?? 0}</p>
    <table><thead><tr><th>Roll barcode</th></tr></thead><tbody>${rolls}</tbody></table>
  `;
}
