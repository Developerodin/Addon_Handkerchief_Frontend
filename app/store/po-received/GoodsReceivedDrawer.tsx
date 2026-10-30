'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { factoryRequest, LotRow, PageResult, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { formatInr } from '../purchase-orders/add/purchaseOrderFormModel';
import { PackingListRow } from '../purchase-orders/markInTransitModel';
import { measurementName } from '../purchase-orders/packingListPdf';
import { fabricLineLabel } from './goodsReceivedModel';
import { downloadGoodsReceivedExcel } from './goodsReceivedExcel';
import { GoodsReceivedLotCard } from './GoodsReceivedLotCard';
import {
  draftsFromLots,
  emptyGoodsLot,
  goodsLotsError,
  goodsLotsPayload,
  GoodsReceivedLotDraft,
  orderTotal,
  receivedForLine,
} from './goodsReceivedModel';

const cell = 'border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700';

/**
 * Right drawer that records supplier lots against an in-transit purchase order.
 */
export function GoodsReceivedDrawer({
  order,
  onClose,
  onSaved,
}: {
  order: PurchaseOrderRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [lots, setLots] = useState<GoodsReceivedLotDraft[]>([emptyGoodsLot()]);
  const [packlists, setPacklists] = useState<PackingListRow[]>([]);
  const [cutoffs, setCutoffs] = useState<Array<{ fabricId: string; approved: boolean }>>([]);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order) return undefined;
    let cancelled = false;
    setLots(draftsFromLots(order.receivedLots));
    setError('');
    setConfirming(false);
    Promise.all([
      factoryRequest<PageResult<PackingListRow>>(`/store/packing-lists?poId=${order.id}&limit=50`),
      factoryRequest<PageResult<LotRow>>(`/store/lots?poId=${order.id}&limit=20`),
    ])
      .then(([packs, lotPage]) => {
        if (cancelled) return;
        setPacklists(packs.results || []);
        setCutoffs(lotPage.results?.[0]?.cutoffs || []);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load goods received';
        setError(message);
        toast.error(message);
      });
    return () => {
      cancelled = true;
    };
  }, [order]);

  if (!order) return null;

  const save = async () => {
    const issue = goodsLotsError(lots);
    if (issue) {
      setError(issue);
      toast.error(issue);
      setConfirming(false);
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { lots: payload } = goodsLotsPayload(lots, order);
      await factoryRequest(`/store/purchase-orders/${order.id}/received-lots`, {
        method: 'PATCH',
        body: JSON.stringify({ lots: payload }),
      });
      toast.success(`${order.number} goods received`);
      await onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update goods received';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-gray-900/40" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="goods-received-title" className="flex h-full w-full max-w-[1100px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between bg-primary px-4 py-3 text-white">
          <div>
            <h2 id="goods-received-title" className="text-sm font-bold">Goods Received</h2>
            <p className="text-xs text-white/80">{order.number}</p>
          </div>
          <button type="button" aria-label="Close" className="rounded p-1 text-white hover:bg-white/10" disabled={saving} onClick={onClose}>
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="rounded border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-700">Order Details</h3>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-emerald-600/40 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700"
                onClick={() => downloadGoodsReceivedExcel(order, lots).catch((err) => toast.error(err instanceof Error ? err.message : 'Could not download Excel'))}
              >
                <i className="ri-file-excel-2-line" aria-hidden />
                Download Excel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Detail label="PO Number" value={order.number} />
              <Detail label="Supplier" value={order.supplierName} />
              <Detail label="Order Date" value={order.purchaseDate ? new Date(order.purchaseDate).toLocaleDateString('en-GB') : '—'} />
              <Detail label="Total Amount" value={formatInr(orderTotal(order.lines))} />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {['Fabric name', 'Sort No', 'Type', 'Color', 'Quantity', 'Qty received in meter', 'Rate'].map((label) => (
                      <th key={label} className={cell}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(order.lines || []).map((line) => (
                    <tr key={line.lineId}>
                      <td className="border border-gray-300 px-2 py-1.5">{line.fabricName || '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5">{line.fabricSortNo || '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5">{line.fabricTypeName || '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5">{line.colourName || '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{Number(line.quantity || 0).toLocaleString('en-IN')} {line.unitName || ''}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{receivedForLine(lots, line.lineId).toLocaleString('en-IN')}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{formatInr(line.rate || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded border border-gray-300 bg-gray-50 p-3">
            <h3 className="mb-2 text-xs font-semibold text-gray-700">Packlist Details</h3>
            {packlists.length ? packlists.map((pack, index) => (
              <PacklistBlock key={pack.id || index} index={index} pack={pack} order={order} />
            )) : <p className="text-xs text-gray-500">No packlist on this order yet.</p>}
          </section>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">Received Lot Details</h3>
            <button type="button" className="rounded bg-gray-700 px-3 py-1.5 text-[11px] font-bold text-white" onClick={() => setLots((rows) => [emptyGoodsLot(), ...rows])}>
              Add Lot
            </button>
          </div>
          {lots.map((lot, index) => (
            <GoodsReceivedLotCard
              key={lot.key}
              index={index}
              lot={lot}
              lines={order.lines || []}
              cutoffs={cutoffs}
              canRemove={lots.length > 1}
              onChange={(next) => setLots((rows) => rows.map((row) => (row.key === lot.key ? next : row)))}
              onRemove={() => setLots((rows) => rows.filter((row) => row.key !== lot.key))}
            />
          ))}
          {error ? <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">{error}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
          <button type="button" className="rounded border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700" disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60" disabled={saving} onClick={save}>
            <i className={saving ? 'ri-loader-4-line animate-spin' : 'ri-check-line'} aria-hidden />
            {confirming ? 'Confirm update' : 'Update Order'}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

/**
 * Read-only packlist captured when the order was marked in transit.
 */
function PacklistBlock({ pack, index, order }: { pack: PackingListRow; index: number; order: PurchaseOrderRow }) {
  const names = (pack.lineIds || [])
    .map((id) => order.lines.find((line) => line.lineId === id))
    .filter(Boolean)
    .map((line) => fabricLineLabel(line as PurchaseOrderRow['lines'][number]))
    .join(', ') || '—';
  const rows: Array<[string, string]> = [
    ['Packing number', pack.packingListCode || '—'],
    ['Courier name', pack.courierName || '—'],
    ['Courier number', pack.courierNumber || '—'],
    ['Vehicle number', pack.vehicleNumber || '—'],
    ['Challan number', pack.challanNumber || '—'],
    ['Dispatch date', pack.shipmentDate ? new Date(pack.shipmentDate).toLocaleDateString('en-GB') : '—'],
    ['Estimated delivery', pack.expectedDelivery ? new Date(pack.expectedDelivery).toLocaleDateString('en-GB') : '—'],
    ['Rolls', String(pack.rolls ?? pack.boxes ?? 0)],
    ['Weight', String(pack.weight ?? 0)],
    ['PO items', names],
  ];
  if (pack.notes) rows.push(['Notes', pack.notes]);
  if (pack.millName) rows.push(['Mill', pack.millName]);
  if (pack.consigneeName) rows.push(['Consignee', pack.consigneeName]);
  if (pack.customerCity) rows.push(['Customer city', pack.customerCity]);
  if (pack.invoiceNumber) rows.push(['Invoice number', pack.invoiceNumber]);
  if (pack.division) rows.push(['Division', pack.division]);
  if (pack.lrNo) rows.push(['LR no', pack.lrNo]);
  if (pack.lrDate) rows.push(['LR date', new Date(pack.lrDate).toLocaleDateString('en-GB')]);
  return (
    <div className="mb-3 overflow-hidden rounded border border-gray-300 bg-white last:mb-0">
      <p className="border-b border-gray-300 bg-gray-50 px-2 py-1.5 text-[10px] font-bold uppercase text-gray-700">Packlist {index + 1}</p>
      <table className="min-w-full border-collapse text-xs">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th className={`${cell} w-[38%]`}>{label}</th>
              <td className="border border-gray-300 px-2 py-1.5 text-gray-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pack.cartons?.length ? (
        <div className="overflow-x-auto border-t border-gray-300">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['Carton', 'Fabric', 'Mill old', 'Count', 'Net wt', 'Gross wt', 'Qty', 'UOM', 'Batch'].map((label) => (
                  <th key={label} className={cell}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pack.cartons.map((carton, cartonIndex) => (
                <tr key={`${carton.cartonNumber || cartonIndex}`}>
                  <td className="border border-gray-300 px-2 py-1.5">{carton.cartonNumber || '—'}</td>
                  <td className="border border-gray-300 px-2 py-1.5">{carton.fabricName || carton.materialCode || '—'}</td>
                  <td className="border border-gray-300 px-2 py-1.5">{carton.millOldFabricSortNo || carton.millSortKey || '—'}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right">{carton.count ?? 0}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right">{carton.netWeight ?? 0}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right">{carton.grossWeight ?? 0}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right">{carton.totalQty ?? 0}</td>
                  <td className="border border-gray-300 px-2 py-1.5">{carton.uom ? measurementName(carton.uom) : '—'}</td>
                  <td className="border border-gray-300 px-2 py-1.5">{carton.batch || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
