/**
 * Fills `/templates/purchase-order.html` from a saved purchase order
 * and opens the browser print dialog. Layout matches the goods receipt note.
 */

import { PurchaseOrderLine, PurchaseOrderRow, factoryRequest } from '@/shared/services/factoryApi';
import { FabricSupplier, listFabricSuppliers } from '@/shared/services/fabricSupplierService';
import { ADDON_COMPANY } from '@/shared/constants/addonCompany';
import { escapeHtml } from '@/shared/utils/printHtmlDocument';

const TEMPLATE_PATH = '/templates/purchase-order.html';
const HOME_STATES = new Set(['maharashtra', 'mh']);

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

interface PoTotals {
  subTotal: number;
  taxableValue: number;
  roundOff: number;
  sgst: number;
  cgst: number;
  igst: number;
  grandTotal: number;
  totalQty: number;
  taxLabel: string;
  amountInWords: string;
}

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
 * @param value - date-ish input
 * @returns DD-MM-YYYY, or empty when the value cannot be parsed
 */
function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

/** Indian-grouped number with a fixed fraction length. */
function formatInr(value: number, fractionDigits = 2): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
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
 * Looks up the fabric supplier so GST, phone, and address print. Missing supplier still prints.
 */
async function loadSupplier(name?: string): Promise<FabricSupplier | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  try {
    const page = await listFabricSuppliers({ name: trimmed, limit: 10 });
    return page.results.find((row) => row.name.trim().toLowerCase() === trimmed.toLowerCase()) || null;
  } catch (err) {
    console.error('Purchase order print could not load supplier', err);
    return null;
  }
}

/**
 * Basic value, per-line GST split, and rounded grand total.
 */
function totalsFor(lines: PurchaseOrderLine[], supplier: FabricSupplier | null): PoTotals {
  const priced = lines.map((line) => {
    const quantity = Number(line.quantity) || 0;
    const rate = Number(line.rate) || 0;
    const amount = quantity * rate;
    const gst = (amount * (Number(line.gstPercent) || 0)) / 100;
    return { quantity, amount, gst, gstRate: Number(line.gstPercent) || 0 };
  });
  const subTotal = priced.reduce((sum, row) => sum + row.amount, 0);
  const totalQty = priced.reduce((sum, row) => sum + row.quantity, 0);
  const gst = priced.reduce((sum, row) => sum + row.gst, 0);
  const rates = Array.from(new Set(priced.map((row) => row.gstRate)));
  const local = sameState(supplier);
  const preRound = subTotal + gst;
  const roundOff = Math.round(preRound) - preRound;
  const grandTotal = preRound + roundOff;
  const rateLabel = rates.length === 1 ? `${rates[0].toFixed(1)}%` : '';
  return {
    subTotal,
    taxableValue: subTotal,
    roundOff,
    sgst: local ? gst / 2 : 0,
    cgst: local ? gst / 2 : 0,
    igst: local ? 0 : gst,
    grandTotal,
    totalQty,
    taxLabel: local ? `GST ${rateLabel}`.trim() : `IGST ${rateLabel}`.trim(),
    amountInWords: amountInWords(grandTotal),
  };
}

/**
 * Description cell: fabric name, then sort, mill, and count when present.
 */
function describe(line: PurchaseOrderLine): string {
  const name = escapeHtml(line.fabricName || 'Fabric');
  const bits = [
    line.fabricSortNo ? `Sort ${line.fabricSortNo}` : '',
    line.millOldFabricSortNo ? `Mill old ${line.millOldFabricSortNo}` : '',
    line.millNewFabricSortNo ? `Mill new ${line.millNewFabricSortNo}` : '',
    line.countName ? `Count ${line.countName}` : '',
  ].filter(Boolean);
  if (!bits.length) return name;
  return `${name}<div class="item-meta">${bits.map((bit) => escapeHtml(bit)).join('<br>')}</div>`;
}

/**
 * One ordered line: colour, description, qty, rate, unit, amount.
 */
function buildItemsHtml(lines: PurchaseOrderLine[]): string {
  return lines
    .map((line, index) => {
      const quantity = Number(line.quantity) || 0;
      const rate = Number(line.rate) || 0;
      return `
          <tr>
            <td class="text-center col-sr" style="border: 1px solid #000; padding: 4px;">${index + 1}</td>
            <td class="text-center col-color" style="border: 1px solid #000; padding: 4px;">${escapeHtml(line.colourName || 'N/A')}</td>
            <td class="col-desc" style="border: 1px solid #000; padding: 4px;">${describe(line)}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatInr(quantity, 2)}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatInr(rate, 2)}</td>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">${escapeHtml(line.unitName || '—')}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatInr(quantity * rate, 2)}</td>
          </tr>`;
    })
    .join('');
}

/**
 * Replaces the inner HTML of the element with `id`.
 */
function setById(html: string, id: string, value: string): string {
  const re = new RegExp(`id="${id}"[^>]*>[\\s\\S]*?<\\/(div|span|td|p)>`, 'i');
  const tagMatch = html.match(re);
  if (!tagMatch) return html;
  return html.replace(re, `id="${id}">${value}</${tagMatch[1]}>`);
}

/**
 * Hides a summary row when the amount is zero.
 */
function hideRowIfZero(html: string, rowId: string, value: number): string {
  if (Math.abs(value) >= 0.0001) return html;
  return html.replace(
    new RegExp(`<tr id="${rowId}"[^>]*>[\\s\\S]*?<\\/tr>`, 'i'),
    `<tr id="${rowId}" style="display:none;"><td></td><td></td></tr>`
  );
}

/**
 * Pours the order into the purchase-order HTML template.
 * @throws when the template cannot be loaded
 */
async function renderPurchaseOrderHtml(order: PurchaseOrderRow, supplier: FabricSupplier | null): Promise<string> {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) throw new Error('Failed to load purchase order template');
  let html = await response.text();
  const street = supplier?.address || order.supplierAddress || '';
  const pin = supplier?.pincode ? ` ${supplier.pincode}` : '';
  const location = [supplier?.city, supplier?.state].filter(Boolean).join(', ');
  const address = `${escapeHtml(street || 'N/A')}${pin ? escapeHtml(pin) : ''}${location ? `<br>${escapeHtml(location)}` : ''}`;
  const totals = totalsFor(order.lines || [], supplier);

  html = setById(html, 'consignee-name', escapeHtml(ADDON_COMPANY.name));
  html = setById(html, 'consignee-address', escapeHtml(ADDON_COMPANY.address));
  html = setById(html, 'consignee-head-office', escapeHtml(ADDON_COMPANY.headOffice));
  html = setById(html, 'consignee-contact', escapeHtml(ADDON_COMPANY.contactNumber));
  html = setById(html, 'consignee-email', escapeHtml(ADDON_COMPANY.email));
  html = setById(html, 'consignee-state-code', escapeHtml(ADDON_COMPANY.stateCode));
  html = setById(html, 'consignee-gst', escapeHtml(ADDON_COMPANY.gstNo));
  html = setById(html, 'signatory-company-name', escapeHtml(ADDON_COMPANY.name));
  html = setById(html, 'supplier-name', escapeHtml(supplier?.name || order.supplierName || 'N/A'));
  html = html.replace(/id="supplier-address"[^>]*>[\s\S]*?<\/div>/i, `id="supplier-address">${address}</div>`);
  html = setById(html, 'supplier-email', escapeHtml(supplier?.email || 'N/A'));
  html = setById(html, 'supplier-mob', escapeHtml(supplier?.contactNumber || 'N/A'));
  html = setById(html, 'supplier-gst', escapeHtml(supplier?.gstin || 'N/A'));
  html = setById(html, 'po-no', escapeHtml(order.number || 'N/A'));
  html = setById(html, 'po-date', escapeHtml(formatDate(order.purchaseDate) || 'N/A'));
  html = setById(html, 'expected-delivery', escapeHtml(formatDate(order.estimatedDelivery) || 'N/A'));
  html = setById(html, 'credit-days', escapeHtml(String(order.creditDays ?? 0)));
  html = html.replace(/<tbody id="items-body">[\s\S]*?<\/tbody>/, `<tbody id="items-body">${buildItemsHtml(order.lines || [])}</tbody>`);
  html = setById(html, 'total-qty', formatInr(totals.totalQty, 2));
  html = setById(html, 'total-amount', formatInr(totals.subTotal, 2));
  html = setById(html, 'tax-rate-label', escapeHtml(totals.taxLabel));
  html = setById(html, 'taxable-value', formatInr(totals.taxableValue, 2));
  html = setById(html, 'sgst-amount', formatInr(totals.sgst, 2));
  html = setById(html, 'cgst-amount', formatInr(totals.cgst, 2));
  html = setById(html, 'igst-amount', formatInr(totals.igst, 2));
  html = setById(html, 'basic-value', formatInr(totals.subTotal, 2));
  html = setById(html, 'discount-amount', formatInr(0, 2));
  html = setById(html, 'taxable-value-after-discount', formatInr(totals.taxableValue, 2));
  html = setById(html, 'freight-amount', formatInr(0, 2));
  html = setById(html, 'freight-gst-amount', formatInr(0, 2));
  html = setById(html, 'round-off-amount', formatInr(totals.roundOff, 2));
  html = setById(html, 'grand-total', formatInr(totals.grandTotal, 2));
  html = setById(html, 'amount-in-words', escapeHtml(totals.amountInWords));
  html = hideRowIfZero(html, 'row-discount', 0);
  html = hideRowIfZero(html, 'row-freight', 0);
  html = hideRowIfZero(html, 'row-freight-gst', 0);
  html = hideRowIfZero(html, 'row-round-off', totals.roundOff);
  html = setById(html, 'narration', escapeHtml(order.notes || 'N/A'));
  return html;
}

/**
 * Loads the saved order and opens the purchase-order print dialog.
 * Do not pass `noopener` — that severs the window handle and leaves a blank tab.
 * @throws when the order cannot be loaded, the template fails, or popups are blocked
 */
export async function printPurchaseOrder(orderId: string): Promise<void> {
  const order = await factoryRequest<PurchaseOrderRow>(`/store/purchase-orders/${orderId}`);
  const supplier = await loadSupplier(order.supplierName);
  const html = await renderPurchaseOrderHtml(order, supplier);
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Popup blocked. Allow popups to print the purchase order.');
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
}
