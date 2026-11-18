import { ADDON_COMPANY } from '@/shared/constants/addonCompany';
import { downloadHtmlDocument, escapeHtml, printHtmlDocument } from '@/shared/utils/printHtmlDocument';

export interface DispatchChallanBox {
  barcode: string;
  pieceQty: number;
  bundleCount: number;
  scaleWeight: number;
  rackCode?: string;
  vehicleNumber?: string;
}

export interface DispatchChallanOrder {
  orderNumber: string;
  buyer?: string;
  targetQty: number;
  dispatchedQty: number;
  dispatchStatus: string;
}

function documentBody(order: DispatchChallanOrder, boxes: DispatchChallanBox[], heading: string) {
  const totalPieces = boxes.reduce((sum, row) => sum + (Number(row.pieceQty) || 0), 0);
  const totalWeight = boxes.reduce((sum, row) => sum + (Number(row.scaleWeight) || 0), 0);
  const rows = boxes
    .map(
      (row) =>
        `<tr>
<td>${escapeHtml(row.barcode)}</td>
<td class="num">${row.bundleCount}</td>
<td class="num">${row.pieceQty}</td>
<td class="num">${row.scaleWeight > 0 ? row.scaleWeight : '—'}</td>
<td>${escapeHtml(row.rackCode || '—')}</td>
<td>${escapeHtml(row.vehicleNumber || '—')}</td>
</tr>`
    )
    .join('');
  return `
<h1>${escapeHtml(heading)}</h1>
<p class="company">${escapeHtml(ADDON_COMPANY.name)}</p>
<p>Production order <strong>${escapeHtml(order.orderNumber)}</strong></p>
<p>Buyer ${escapeHtml(order.buyer || '—')}</p>
<p>Target qty ${order.targetQty} · Dispatched ${order.dispatchedQty} · Status ${escapeHtml(order.dispatchStatus)}</p>
<table>
<thead><tr><th>Box barcode</th><th>Bundles</th><th>Pieces</th><th>Weight (kg)</th><th>Rack</th><th>Vehicle</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6">No boxes</td></tr>'}</tbody>
</table>
<p>${boxes.length} box(es) · ${totalPieces} pieces · ${totalWeight > 0 ? `${totalWeight} kg` : '—'}</p>
<p class="sign">Authorised signatory</p>`;
}

const extraStyle = `
.company{font-size:13px;font-weight:600}
.num{text-align:right}
.sign{margin-top:48px}
`;

function wrappedBody(order: DispatchChallanOrder, boxes: DispatchChallanBox[], heading: string) {
  return `<style>${extraStyle}</style>${documentBody(order, boxes, heading)}`;
}

/** Printable dispatch challan for boxes tied to one production order. */
export function printDispatchChallan(order: DispatchChallanOrder, boxes: DispatchChallanBox[], kind: 'challan' | 'note' = 'challan') {
  const heading = kind === 'challan' ? `Dispatch challan — ${order.orderNumber}` : `Dispatch note — ${order.orderNumber}`;
  printHtmlDocument(heading, wrappedBody(order, boxes, heading));
}

/** Download the same HTML as the challan for archive / PDF. */
export function downloadDispatchChallan(order: DispatchChallanOrder, boxes: DispatchChallanBox[], kind: 'challan' | 'note' = 'challan') {
  const heading = kind === 'challan' ? `Dispatch challan — ${order.orderNumber}` : `Dispatch note — ${order.orderNumber}`;
  const safe = order.orderNumber.replace(/[^\w-]+/g, '_');
  downloadHtmlDocument(`${safe}-${kind}.html`, heading, wrappedBody(order, boxes, heading));
}