/**
 * Renders dispatch batches into `/templates/dispatch-challan.html` (GRN-style layout).
 */

import { ADDON_COMPANY } from '@/shared/constants/addonCompany';
import { escapeHtml } from '@/shared/utils/printHtmlDocument';

export interface DispatchChallanBoxRow {
  barcode: string;
  pieceQty: number;
  scaleWeight: number;
  rackCode?: string;
  vehicleNumber?: string;
}

export interface DispatchChallanSnapshot {
  challanNumber: string;
  shipmentCode: string;
  dispatchDate?: string | Date | null;
  orderNumber: string;
  buyer?: string;
  buyerAddress?: string;
  vehicleNumber?: string;
  dispatchStatus?: string;
  targetQty?: number;
  dispatchedQty?: number;
  boxes: DispatchChallanBoxRow[];
}

const TEMPLATE_PATH = '/templates/dispatch-challan.html';

const setById = (html: string, id: string, value: string): string => {
  const re = new RegExp(`id="${id}"[^>]*>[\\s\\S]*?<\\/(div|span|td|p)>`, 'i');
  const tagMatch = html.match(re);
  if (!tagMatch) return html;
  return html.replace(re, `id="${id}">${value}</${tagMatch[1]}>`);
};

const formatDate = (value?: string | Date | null): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
};

const formatQty = (value: number, digits = 0) =>
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const buildBoxesHtml = (boxes: DispatchChallanBoxRow[], vehicle?: string) =>
  boxes
    .map(
      (row, index) => `
      <tr>
        <td class="text-center" style="border: 1px solid #000; padding: 4px;">${index + 1}</td>
        <td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${escapeHtml(row.barcode)}</td>
        <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatQty(row.pieceQty)}</td>
        <td class="text-right" style="border: 1px solid #000; padding: 4px;">${row.scaleWeight > 0 ? formatQty(row.scaleWeight, 2) : '—'}</td>
        <td style="border: 1px solid #000; padding: 4px;">${escapeHtml(row.rackCode || '—')}</td>
        <td style="border: 1px solid #000; padding: 4px;">${escapeHtml(row.vehicleNumber || vehicle || '—')}</td>
      </tr>`
    )
    .join('') || '<tr><td colspan="6" class="text-center" style="padding:8px;">No boxes</td></tr>';

export const renderDispatchChallanHtml = async (snapshot: DispatchChallanSnapshot): Promise<string> => {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) throw new Error('Failed to load dispatch challan template');
  let html = await response.text();

  const totalPieces = snapshot.boxes.reduce((s, row) => s + (Number(row.pieceQty) || 0), 0);
  const totalWeight = snapshot.boxes.reduce((s, row) => s + (Number(row.scaleWeight) || 0), 0);

  html = setById(html, 'consignee-name', escapeHtml(ADDON_COMPANY.name));
  html = setById(html, 'consignee-address', escapeHtml(ADDON_COMPANY.address));
  html = setById(html, 'consignee-head-office', escapeHtml(ADDON_COMPANY.headOffice));
  html = setById(html, 'consignee-contact', escapeHtml(ADDON_COMPANY.contactNumber));
  html = setById(html, 'consignee-gst', escapeHtml(ADDON_COMPANY.gstNo));
  html = setById(html, 'consignee-state-code', escapeHtml(ADDON_COMPANY.stateCode));
  html = setById(html, 'consignee-email', escapeHtml(ADDON_COMPANY.email));
  html = setById(html, 'signatory-company-name', escapeHtml(ADDON_COMPANY.name));

  html = setById(html, 'buyer-name', escapeHtml(snapshot.buyer || '—'));
  html = setById(html, 'buyer-address', escapeHtml(snapshot.buyerAddress || '—'));
  html = setById(html, 'challan-no', escapeHtml(snapshot.challanNumber || snapshot.shipmentCode));
  html = setById(html, 'shipment-code', escapeHtml(snapshot.shipmentCode));
  html = setById(html, 'order-no', escapeHtml(snapshot.orderNumber || '—'));
  html = setById(html, 'dispatch-date', escapeHtml(formatDate(snapshot.dispatchDate) || '—'));
  html = setById(html, 'vehicle-no', escapeHtml(snapshot.vehicleNumber || '—'));
  html = setById(html, 'dispatch-status', escapeHtml(snapshot.dispatchStatus || '—'));

  html = html.replace(/<tbody id="boxes-body">[\s\S]*?<\/tbody>/, `<tbody id="boxes-body">${buildBoxesHtml(snapshot.boxes, snapshot.vehicleNumber)}</tbody>`);

  html = setById(html, 'total-boxes', formatQty(snapshot.boxes.length));
  html = setById(html, 'total-pieces', formatQty(totalPieces));
  html = setById(html, 'total-weight', totalWeight > 0 ? formatQty(totalWeight, 2) : '—');
  html = setById(html, 'order-dispatched', snapshot.dispatchedQty != null ? formatQty(snapshot.dispatchedQty) : '—');
  html = setById(html, 'order-target', snapshot.targetQty != null ? formatQty(snapshot.targetQty) : '—');

  return html;
};

/** Same print flow as GRN — full template HTML, no `noopener`. */
export const printDispatchChallanDocument = async (snapshot: DispatchChallanSnapshot): Promise<void> => {
  const html = await renderDispatchChallanHtml(snapshot);
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Popup blocked. Allow popups to print the challan.');
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  const trigger = () => {
    printWindow.focus();
    printWindow.print();
  };
  if (printWindow.document.readyState === 'complete') setTimeout(trigger, 400);
  else printWindow.onload = () => setTimeout(trigger, 400);
};

export const downloadDispatchChallanDocument = async (snapshot: DispatchChallanSnapshot): Promise<void> => {
  const html = await renderDispatchChallanHtml(snapshot);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safe = (snapshot.challanNumber || snapshot.shipmentCode).replace(/[^\w-]+/g, '_');
  link.href = url;
  link.download = `${safe}-challan.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};