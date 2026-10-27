/**
 * Renders a GRN snapshot into `/templates/goods-received-note.html`.
 * Same document the yarn GRN printer uses. Totals are already on the snapshot.
 */

import { ADDON_COMPANY } from '@/shared/constants/addonCompany';
import { escapeHtml } from '@/shared/utils/printHtmlDocument';

export interface GrnSnapshotItem {
  yarnName?: string;
  sizeCount?: string;
  shadeCode?: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  amount: number;
  gstRate?: number;
  unit?: string;
}

export interface GrnSnapshotLot {
  lotNumber: string;
  numberOfCones: number;
  totalWeight: number;
  netWeight?: number;
  numberOfBoxes: number;
  voided?: boolean;
}

export interface GrnSnapshotSupplier {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  contactNumber?: string;
  gstNo?: string;
}

export interface GrnSnapshotConsignee {
  name?: string;
  address?: string;
  headOffice?: string;
  stateCode?: string;
  state?: string;
  gstNo?: string;
  contactNumber?: string;
  email?: string;
}

export interface GrnSnapshotTotals {
  subTotal: number;
  discountAmount?: number;
  taxableValue?: number;
  freightAmount?: number;
  freightGst?: number;
  roundOff?: number;
  sgst: number;
  cgst?: number;
  igst: number;
  grandTotal: number;
  totalQty: number;
  taxLabel: string;
  amountInWords: string;
}

export interface GrnSnapshot {
  grnNumber: string;
  grnDate: string | Date;
  poNumber: string;
  poDate?: string | Date | null;
  vendorInvoiceNo?: string;
  vendorInvoiceDate?: string | Date | null;
  discrepancyDetails?: string;
  notes?: string;
  supplier?: GrnSnapshotSupplier;
  consignee?: GrnSnapshotConsignee;
  lots: GrnSnapshotLot[];
  items: GrnSnapshotItem[];
  totals: GrnSnapshotTotals;
  revisionNo?: number;
}

const TEMPLATE_PATH = '/templates/goods-received-note.html';

/**
 * Fills missing consignee fields with the Addon legal entity.
 */
const resolveConsignee = (consignee?: GrnSnapshotConsignee): Required<GrnSnapshotConsignee> => ({
  name: consignee?.name?.trim() || ADDON_COMPANY.name,
  address: consignee?.address?.trim() || ADDON_COMPANY.address,
  headOffice: consignee?.headOffice?.trim() || ADDON_COMPANY.headOffice,
  stateCode: consignee?.stateCode?.trim() || ADDON_COMPANY.stateCode,
  state: consignee?.state?.trim() || ADDON_COMPANY.state,
  gstNo: consignee?.gstNo?.trim() || ADDON_COMPANY.gstNo,
  contactNumber: consignee?.contactNumber?.trim() || ADDON_COMPANY.contactNumber,
  email: consignee?.email?.trim() || ADDON_COMPANY.email,
});

/**
 * @param value - date-ish input
 * @returns DD-MM-YYYY, or empty when the value cannot be parsed
 */
const formatDate = (value?: string | Date | null): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
};

/** Indian-grouped number with a fixed fraction length. */
const formatInr = (value: number, fractionDigits = 2): string =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

/**
 * Replaces the inner HTML of the element with `id`.
 */
const setById = (html: string, id: string, value: string): string => {
  const re = new RegExp(`id="${id}"[^>]*>[\\s\\S]*?<\\/(div|span|td|p)>`, 'i');
  const tagMatch = html.match(re);
  if (!tagMatch) return html;
  return html.replace(re, `id="${id}">${value}</${tagMatch[1]}>`);
};

/** Replaces the items table body. */
const setItemsBody = (html: string, rowsHtml: string): string =>
  html.replace(/<tbody id="items-body">[\s\S]*?<\/tbody>/, `<tbody id="items-body">${rowsHtml}</tbody>`);

/**
 * Hides a summary row when the amount is zero.
 */
const hideRowIfZero = (html: string, rowId: string, value: number): string => {
  if (Math.abs(value) >= 0.0001) return html;
  return html.replace(
    new RegExp(`<tr id="${rowId}"[^>]*>[\\s\\S]*?<\\/tr>`, 'i'),
    `<tr id="${rowId}" style="display:none;"><td></td><td></td></tr>`
  );
};

/**
 * Item rows: shade, description, HSN, received qty, rate, unit, amount.
 */
const buildItemsHtml = (items: GrnSnapshotItem[]): string =>
  items
    .map((item, index) => {
      const yarn = escapeHtml(item.yarnName || 'N/A');
      const size = item.sizeCount ? escapeHtml(item.sizeCount) : '';
      const desc = size ? `${yarn} - ${size}` : yarn;
      return `
          <tr>
            <td class="text-center col-sr" style="border: 1px solid #000; padding: 4px;">${index + 1}</td>
            <td class="text-center col-color" style="border: 1px solid #000; padding: 4px;">${escapeHtml(item.shadeCode || 'N/A')}</td>
            <td class="col-desc" style="border: 1px solid #000; padding: 4px;">${desc}</td>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">${escapeHtml(item.hsnCode || '—')}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatInr(item.quantity, 2)}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatInr(item.rate, 2)}</td>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">${escapeHtml(item.unit || 'KGS')}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatInr(item.amount, 2)}</td>
          </tr>`;
    })
    .join('');

/**
 * Lots strip injected above the items table. Roll count sits in the cones column.
 */
const buildLotsBlock = (lots: GrnSnapshotLot[]): string => {
  if (!lots.length) return '';
  const rows = lots
    .map(
      (lot, index) => `
            <tr${lot.voided ? ' style="text-decoration: line-through; color: #888;"' : ''}>
              <td class="text-center" style="border: 1px solid #000; padding: 3px; width: 30px;">${index + 1}</td>
              <td style="border: 1px solid #000; padding: 3px;">${escapeHtml(lot.lotNumber)}${lot.voided ? ' (voided)' : ''}</td>
              <td class="text-right" style="border: 1px solid #000; padding: 3px;">${formatInr(lot.numberOfCones, 0)}</td>
              <td class="text-right" style="border: 1px solid #000; padding: 3px;">${formatInr(lot.totalWeight, 2)}</td>
              <td class="text-right" style="border: 1px solid #000; padding: 3px;">${formatInr(lot.netWeight ?? 0, 2)}</td>
              <td class="text-right" style="border: 1px solid #000; padding: 3px;">${formatInr(lot.numberOfBoxes, 0)}</td>
            </tr>`
    )
    .join('');
  return `
      <table id="lots-table" style="margin-top: 4px;">
        <thead>
          <tr>
            <th style="background-color:#f8f9fa;">SR</th>
            <th style="background-color:#f8f9fa;">LOT NO</th>
            <th style="background-color:#f8f9fa;">ROLLS</th>
            <th style="background-color:#f8f9fa;">GROSS (kg)</th>
            <th style="background-color:#f8f9fa;">NET (kg)</th>
            <th style="background-color:#f8f9fa;">BOXES</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
};

/**
 * Pours the snapshot into the GRN HTML template.
 * @throws when the template cannot be loaded
 */
const renderGrnHtml = async (grn: GrnSnapshot): Promise<string> => {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) throw new Error('Failed to load GRN template');
  let html = await response.text();
  const supplier = grn.supplier || {};
  const consignee = resolveConsignee(grn.consignee);
  const location = [supplier.city, supplier.state].filter(Boolean).join(', ');
  const address = `${escapeHtml(supplier.address || 'N/A')}${location ? `<br>${escapeHtml(location)}` : ''}`;

  html = setById(html, 'consignee-name', escapeHtml(consignee.name));
  html = setById(html, 'consignee-address', escapeHtml(consignee.address));
  html = setById(html, 'consignee-head-office', escapeHtml(consignee.headOffice));
  html = setById(html, 'consignee-contact', escapeHtml(consignee.contactNumber));
  html = setById(html, 'consignee-email', escapeHtml(consignee.email));
  html = setById(html, 'consignee-state-code', escapeHtml(consignee.stateCode));
  html = setById(html, 'consignee-gst', escapeHtml(consignee.gstNo));
  html = setById(html, 'signatory-company-name', escapeHtml(consignee.name));
  html = setById(html, 'supplier-name', escapeHtml(supplier.name || 'N/A'));
  html = html.replace(/id="supplier-address"[^>]*>[\s\S]*?<\/div>/i, `id="supplier-address">${address}</div>`);
  html = setById(html, 'supplier-email', escapeHtml(supplier.email || 'N/A'));
  html = setById(html, 'supplier-mob', escapeHtml(supplier.contactNumber || 'N/A'));
  html = setById(html, 'supplier-gst', escapeHtml(supplier.gstNo || 'N/A'));
  html = setById(html, 'po-no', escapeHtml(grn.poNumber || 'N/A'));
  html = setById(html, 'po-date', escapeHtml(formatDate(grn.poDate) || 'N/A'));
  html = setById(html, 'vendor-invoice-no', escapeHtml(grn.vendorInvoiceNo || ''));
  html = setById(html, 'vendor-invoice-date', escapeHtml(formatDate(grn.vendorInvoiceDate)));
  html = setById(html, 'grn-no', escapeHtml(grn.grnNumber));
  html = setById(html, 'grn-date', escapeHtml(formatDate(grn.grnDate)));

  const lotsBlock = buildLotsBlock(grn.lots || []);
  if (lotsBlock) {
    html = html.replace(/<table class="items-table">/, `${lotsBlock}\n        <table class="items-table">`);
  }

  const totals = grn.totals;
  html = setItemsBody(html, buildItemsHtml(grn.items || []));
  html = setById(html, 'total-qty', formatInr(totals?.totalQty ?? 0, 2));
  html = setById(html, 'total-amount', formatInr(totals?.subTotal ?? 0, 2));
  html = setById(html, 'tax-rate-label', escapeHtml(totals?.taxLabel || ''));
  html = setById(html, 'taxable-value', formatInr(totals?.taxableValue ?? totals?.subTotal ?? 0, 2));
  html = setById(html, 'sgst-amount', formatInr(totals?.sgst ?? 0, 2));
  html = setById(html, 'cgst-amount', formatInr(totals?.cgst ?? 0, 2));
  html = setById(html, 'igst-amount', formatInr(totals?.igst ?? 0, 2));
  html = setById(html, 'basic-value', formatInr(totals?.subTotal ?? 0, 2));
  html = setById(html, 'discount-amount', formatInr(totals?.discountAmount ?? 0, 2));
  html = setById(html, 'taxable-value-after-discount', formatInr(totals?.taxableValue ?? totals?.subTotal ?? 0, 2));
  html = setById(html, 'freight-amount', formatInr(totals?.freightAmount ?? 0, 2));
  html = setById(html, 'freight-gst-amount', formatInr(totals?.freightGst ?? 0, 2));
  html = setById(html, 'round-off-amount', formatInr(totals?.roundOff ?? 0, 2));
  html = setById(html, 'grand-total', formatInr(totals?.grandTotal ?? 0, 2));
  html = setById(html, 'amount-in-words', escapeHtml(totals?.amountInWords || ''));
  html = hideRowIfZero(html, 'row-discount', totals?.discountAmount ?? 0);
  html = hideRowIfZero(html, 'row-freight', totals?.freightAmount ?? 0);
  html = hideRowIfZero(html, 'row-freight-gst', totals?.freightGst ?? 0);
  html = hideRowIfZero(html, 'row-round-off', totals?.roundOff ?? 0);
  html = setById(html, 'narration', escapeHtml(grn.notes || 'N/A'));
  html = setById(html, 'discrepancy-details', escapeHtml(grn.discrepancyDetails || ''));

  if (grn.revisionNo && grn.revisionNo > 0) {
    html = html.replace(
      /<div class="header-title" id="page-title">[\s\S]*?<\/div>/,
      `<div class="header-title" id="page-title">GOODS RECEIPT NOTE — REVISION ${grn.revisionNo}</div>`
    );
  }
  return html;
};

/**
 * Opens the filled GRN and the browser print dialog.
 * The dialog's selected paper size is used (`@page { size: auto }`).
 * Do not pass `noopener` — that severs the window handle and leaves a blank tab.
 * @throws when popups are blocked or the template fails to load
 */
export const printGrnDocument = async (grn: GrnSnapshot): Promise<void> => {
  const html = await renderGrnHtml(grn);
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Popup blocked. Allow popups to print the GRN.');
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  const trigger = () => {
    printWindow.focus();
    printWindow.print();
  };
  if (printWindow.document.readyState === 'complete') {
    setTimeout(trigger, 400);
    return;
  }
  printWindow.onload = () => setTimeout(trigger, 400);
};

/**
 * Downloads the same filled HTML so it can be reopened and printed later.
 */
export const downloadGrnHtml = async (grn: GrnSnapshot): Promise<void> => {
  const html = await renderGrnHtml(grn);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${grn.grnNumber}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
