import { PurchaseOrderRow, ReceiptRow, RollRow } from '@/shared/services/factoryApi';
import { escapeHtml } from '@/shared/utils/printHtmlDocument';

/**
 * Printable GRN body: header, lots, and rolls.
 */
export function grnBody(grn: ReceiptRow, rolls: RollRow[], order: PurchaseOrderRow | null): string {
  const lotRows = [...new Set(rolls.map((roll) => roll.receivedLotNumber).filter(Boolean))]
    .map((lot) => `<tr><td>${escapeHtml(lot || '')}</td><td>${rolls.filter((roll) => roll.receivedLotNumber === lot).length}</td></tr>`)
    .join('');
  const rollRows = rolls
    .map((roll) => `<tr><td>${escapeHtml(roll.rollCode || roll.barcode)}</td><td>${escapeHtml(roll.fabricName || '')}</td><td>${roll.netWeight || 0}</td></tr>`)
    .join('');
  return `
    <h1>${escapeHtml(grn.number)}</h1>
    <p>Supplier ${escapeHtml(grn.supplierName || '—')}</p>
    <p>PO ${escapeHtml(order?.number || grn.poId)}</p>
    <p>Received ${grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString('en-IN') : '—'}</p>
    <p>Receiver ${escapeHtml(grn.receiver || '—')}</p>
    <p>Condition ${escapeHtml(grn.condition || '—')}</p>
    <p>Gross ${grn.grossWeight ?? 0} · Net ${grn.netWeight ?? 0}</p>
    <p>Notes ${escapeHtml(grn.notes || '—')}</p>
    <h2>Lots</h2>
    <table><thead><tr><th>Lot</th><th>Rolls</th></tr></thead><tbody>${lotRows}</tbody></table>
    <h2>Rolls</h2>
    <table><thead><tr><th>Roll</th><th>Fabric</th><th>Net</th></tr></thead><tbody>${rollRows}</tbody></table>
  `;
}
