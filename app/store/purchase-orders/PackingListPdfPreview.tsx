'use client';

import React from 'react';
import { PurchaseOrderLine, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { PackingCarton, TransitPackEntry } from './markInTransitModel';
import { cartonQuantity, ParsedPackingList, measurementName, sameMeasurement, totalsFromCartons } from './packingListPdf';

const cell = 'border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700';
const inputClass = 'w-full min-w-[4.5rem] border-0 bg-transparent px-1.5 py-1 text-xs text-gray-900 focus:bg-primary/5 focus:outline-none';

function pdfOrCurrent(pdf: string, current: string): string {
  return pdf.trim() || current;
}

function sumColumn(cartons: PackingCarton[], key: 'netWeight' | 'grossWeight' | 'totalQty'): string {
  const total = cartons.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
  return total ? String(Math.round(total * 100) / 100) : '0';
}

function countTotal(cartons: PackingCarton[]): string {
  const values = cartons.map((row) => String(row.count || '').trim()).filter(Boolean);
  if (!values.length) return '0';
  const numeric = values.every((value) => /^-?\d+(\.\d+)?$/.test(value));
  if (numeric) {
    const total = values.reduce((sum, value) => sum + Number(value), 0);
    return total ? String(Math.round(total * 100) / 100) : '0';
  }
  return Array.from(new Set(values)).join(', ');
}

function pcsTotal(cartons: PackingCarton[]): string {
  const total = cartons.reduce((sum, row) => sum + (Number(row.totalPcs) || 0), 0);
  return total ? `Pcs ${total}` : '';
}

/**
 * Editable carton rows. Rolls and weight on the packing list are the sums of these rows.
 */
export function PackingCartonTable({
  cartons,
  lines,
  onChange,
}: {
  cartons: PackingCarton[];
  lines: PurchaseOrderLine[];
  onChange: (cartons: PackingCarton[]) => void;
}) {
  const patch = (index: number, next: Partial<PackingCarton>) => {
    onChange(cartons.map((row, rowIndex) => (rowIndex === index ? { ...row, ...next } : row)));
  };
  if (!cartons.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-gray-50">
          <tr>
            {['Carton', 'Fabric', 'Mill old', 'Count', 'Net wt', 'Gross wt', 'Qty', 'UOM', 'Design', 'Product', 'Finish width', 'Batch'].map((label) => (
              <th key={label} className={cell}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cartons.map((row, index) => {
            const line = lines.find((item) => item.lineId === row.lineId);
            const unitOk = !line || sameMeasurement(row.uom, line.unitName || '');
            return (
              <tr key={`${row.cartonNumber}-${index}`}>
                <td className="border border-gray-300 px-2 py-1 align-top">
                  <div className="font-semibold">{row.cartonNumber || '—'}</div>
                  <div className="max-w-[14rem] whitespace-pre-wrap text-[10px] text-gray-500">{row.materialCode}</div>
                </td>
                <td className="border border-gray-300 px-2 py-1 align-top">
                  {row.fabricName || 'No fabric master match'}
                  {row.millSortKey ? <div className="text-[10px] text-gray-500">Sort key {row.millSortKey}</div> : null}
                  {row.lineId || lines.some((item) => item.fabricId && item.fabricId === row.fabricId) ? null : row.fabricName ? (
                    <div className="text-[10px] font-semibold text-amber-700">PO line not selected</div>
                  ) : null}
                </td>
                <td className="border border-gray-300 px-2 py-1 align-top">{row.millOldFabricSortNo || row.millSortKey || '—'}</td>
                <td className="border border-gray-300 p-0"><input aria-label={`Count ${index + 1}`} className={`${inputClass} min-w-[8rem]`} value={row.count} onChange={(event) => patch(index, { count: event.target.value })} /></td>
                <td className="border border-gray-300 p-0"><input aria-label={`Net weight ${index + 1}`} className={inputClass} value={row.netWeight} onChange={(event) => patch(index, { netWeight: event.target.value.replace(/[^\d.]/g, '') })} /></td>
                <td className="border border-gray-300 p-0"><input aria-label={`Gross weight ${index + 1}`} className={inputClass} value={row.grossWeight} onChange={(event) => patch(index, { grossWeight: event.target.value.replace(/[^\d.]/g, '') })} /></td>
                <td className="border border-gray-300 p-0"><input aria-label={`Quantity ${index + 1}`} className={inputClass} value={row.totalQty} onChange={(event) => patch(index, { totalQty: event.target.value.replace(/[^\d.]/g, '') })} /></td>
                <td className="border border-gray-300 px-2 py-1 align-top">
                  {row.uom ? measurementName(row.uom) : '—'}
                  {unitOk ? null : <div className="text-[10px] font-semibold text-amber-700">Line unit is {line?.unitName}</div>}
                </td>
                <td className="border border-gray-300 px-2 py-1 align-top">{row.designShade || '—'}</td>
                <td className="border border-gray-300 px-2 py-1 align-top">{row.product || '—'}</td>
                <td className="border border-gray-300 px-2 py-1 align-top">{row.finishWidth || '—'}</td>
                <td className="border border-gray-300 px-2 py-1 align-top">{row.batch || '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold">
            <td className="border border-gray-300 px-2 py-1.5" colSpan={3}>Total lines {cartons.length}</td>
            <td className="border border-gray-300 px-2 py-1.5">{countTotal(cartons)}</td>
            <td className="border border-gray-300 px-2 py-1.5">{sumColumn(cartons, 'netWeight')}</td>
            <td className="border border-gray-300 px-2 py-1.5">{sumColumn(cartons, 'grossWeight')}</td>
            <td className="border border-gray-300 px-2 py-1.5">{sumColumn(cartons, 'totalQty')}</td>
            <td className="border border-gray-300 px-2 py-1.5" colSpan={5}>{pcsTotal(cartons)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * PDF values that will be saved on the packing list. Approve copies each value into its one system field.
 */
export function PackingListPdfPreview({
  parsed,
  order,
  entry,
  cartons,
  onCartons,
  onClose,
  onApply,
}: {
  parsed: ParsedPackingList;
  order: PurchaseOrderRow;
  entry: TransitPackEntry;
  cartons: PackingCarton[];
  onCartons: (cartons: PackingCarton[]) => void;
  onClose: () => void;
  onApply: (next: Partial<TransitPackEntry>) => void;
}) {
  const fields: Array<[string, string]> = [
    ['Courier', parsed.transporter],
    ['Vehicle number', parsed.truckNo],
    ['Courier number', parsed.lrNo],
    ['Challan number', parsed.invoiceNumber],
    ['Dispatch date', parsed.lrDate],
    ['Mill name', parsed.millName],
    ['Consignee', parsed.consigneeName],
    ['Customer city', parsed.customerCity],
    ['Division', parsed.division],
    ['Invoice date', parsed.invoiceDate],
    ['Packing number', parsed.packingNumber],
  ];

  const apply = () => {
    const totals = totalsFromCartons(cartons);
    const packed = cartonQuantity(cartons);
    const lineIds = totals.lineIds.length ? totals.lineIds : entry.lineIds;
    onApply({
      packingNumber: parsed.packingNumber || entry.packingNumber,
      courierName: pdfOrCurrent(parsed.transporter, entry.courierName),
      vehicleNumber: pdfOrCurrent(parsed.truckNo, entry.vehicleNumber),
      courierNumber: pdfOrCurrent(parsed.lrNo, entry.courierNumber),
      challanNumber: pdfOrCurrent(parsed.invoiceNumber, entry.challanNumber),
      dispatchDate: pdfOrCurrent(parsed.lrDate, entry.dispatchDate),
      millName: parsed.millName,
      consigneeName: parsed.consigneeName,
      customerCity: parsed.customerCity,
      invoiceNumber: '',
      invoiceDate: parsed.invoiceDate,
      division: parsed.division,
      lrNo: '',
      lrDate: '',
      cartons,
      lineIds,
      rolls: totals.rolls,
      weight: totals.weight,
      quantity: packed > 0 ? String(packed) : entry.quantity,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="pack-pdf-title" className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 id="pack-pdf-title" className="text-sm font-bold text-gray-900">Packing list preview</h2>
            <p className="text-xs text-gray-500">PO number {order.number} stays as opened. Each carton row is saved.</p>
          </div>
          <button type="button" aria-label="Close preview" className="rounded p-1 text-gray-500 hover:bg-gray-100" onClick={onClose}>
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {parsed.orderNo ? (
            <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              The PDF order number is {parsed.orderNo}. The open purchase order stays {order.number}.
            </p>
          ) : null}
          {parsed.millName && order.supplierName && parsed.millName.toLowerCase() !== order.supplierName.toLowerCase() ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              PDF mill is {parsed.millName}. This order supplier is {order.supplierName}. The supplier on the order is not changed.
            </p>
          ) : null}
          {parsed.warnings.filter((warning) => !/have count 0/.test(warning) || cartons.some((row) => !String(row.count || '').trim())).map((warning) => (
            <p key={warning} className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{warning}</p>
          ))}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['Stored field', 'PDF value'].map((label) => (
                    <th key={label} className={cell}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map(([label, value]) => (
                  <tr key={label}>
                    <td className="border border-gray-300 px-2 py-1.5">{label}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PackingCartonTable cartons={cartons} lines={order.lines || []} onChange={onCartons} />
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button type="button" className="rounded border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded bg-primary px-4 py-2 text-xs font-semibold text-white" onClick={apply}>Use this packing list</button>
        </footer>
      </section>
    </div>
  );
}
