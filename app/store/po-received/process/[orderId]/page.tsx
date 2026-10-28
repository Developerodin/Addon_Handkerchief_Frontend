'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { factoryRequest, PageResult, PurchaseOrderLine, PurchaseOrderRow, RollRow } from '@/shared/services/factoryApi';
import { formatInr } from '../../../purchase-orders/add/purchaseOrderFormModel';
import { orderTotal, rollSortNo } from '../../goodsReceivedModel';
import { A4BarcodePreview, A4PreviewLabel } from '@/shared/components/print/A4BarcodePreview';
import { ProcessLotTable } from '../ProcessLotTable';
import { connectQz, isQzConnected, printRollLabels, RollLabel } from '@/shared/utils/qzRollPrint';

/**
 * Turns a roll into the label QZ Tray and the A4 preview print.
 * Fabric, colour, and sort come from the PO item stamped on the roll.
 */
function labelFor(roll: RollRow, lines: PurchaseOrderLine[] = []): RollLabel {
  const line = (lines || []).find((item) => item.lineId === roll.lineId);
  return {
    barcode: roll.barcode,
    rollCode: roll.rollCode || roll.barcode,
    lotNumber: roll.receivedLotNumber || '',
    fabricName: roll.fabricName || line?.fabricName || '',
    colourName: roll.colourName || line?.colourName || '',
    sortNo: rollSortNo(roll.lineId, lines),
  };
}

/**
 * Fabric process page: one barcode per received roll, scan to weigh, print through QZ Tray.
 */
export default function ProcessOrderPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const scanRef = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState<PurchaseOrderRow | null>(null);
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [activeId, setActiveId] = useState('');
  const [scrollKey, setScrollKey] = useState('');
  const [scan, setScan] = useState('');
  const [printer, setPrinter] = useState('');
  const [qzConnected, setQzConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [preview, setPreview] = useState<A4PreviewLabel[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      factoryRequest<PurchaseOrderRow>(`/store/purchase-orders/${orderId}`),
      factoryRequest<PageResult<RollRow>>(`/store/rolls?poId=${orderId}&limit=100`),
    ])
      .then(([po, page]) => {
        if (cancelled) return;
        setOrder(po);
        setRolls((page.results || []).slice().sort((left, right) => (left.rollCode || '').localeCompare(right.rollCode || '', undefined, { numeric: true })));
        document.title = `Process ${po.number}`;
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load this order';
        setError(message);
        toast.error(message);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    scanRef.current?.focus();
  }, [rolls.length]);

  const groups = useMemo(() => {
    const map = new Map<string, RollRow[]>();
    rolls.forEach((roll) => {
      const key = roll.receivedLotNumber || 'Unassigned';
      map.set(key, [...(map.get(key) || []), roll]);
    });
    return [...map.entries()];
  }, [rolls]);

  const receivedQty = (order?.receivedLots || []).reduce(
    (sum, lot) => sum + (lot.lines || []).reduce((inner, line) => inner + (Number(line.receivedQuantity) || 0), 0),
    0
  );
  const unit = order?.lines?.[0]?.unitName || '';

  /**
   * Opens the QZ Tray allow prompt and remembers the default printer.
   */
  const connect = async () => {
    setConnecting(true);
    try {
      const name = await connectQz();
      setPrinter(name);
      setQzConnected(true);
      toast.success(`QZ Tray connected · ${name}`);
    } catch (err) {
      setQzConnected(isQzConnected());
      toast.error(err instanceof Error ? err.message : 'Could not connect QZ Tray');
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Opens the A4 preview for these rolls. Printing happens from that dialog.
   */
  const openPreview = (rows: RollRow[]) => {
    const supplier = [order?.supplierName, order?.supplierAddress].filter(Boolean).join(', ') || '—';
    setPreview(rows.map((roll) => {
      const lines = order?.lines || [];
      const label = labelFor(roll, lines);
      const line = lines.find((item) => item.lineId === roll.lineId);
      const fabric = [label.fabricName, line?.fabricTypeName, label.colourName, label.sortNo].filter(Boolean).join(' · ') || '—';
      return {
        id: roll.id,
        name: label.rollCode,
        detail: label.barcode,
        title: label.rollCode,
        subtitle: '',
        lines: [
          `Fabric: ${fabric}`,
          `Lot: ${label.lotNumber || '—'}`,
          `PO: ${roll.poNumber || order?.number || '—'}`,
          `Supplier: ${supplier}`,
        ],
        barcode: label.barcode,
      };
    }));
  };

  /**
   * Prints the given rolls. Connects first when the websocket is down.
   */
  const printLabels = async (rows: RollRow[]) => {
    setPrinting(true);
    try {
      const target = printer || await connectQz();
      setPrinter(target);
      setQzConnected(true);
      await printRollLabels(target, rows.map((roll) => labelFor(roll, order?.lines || [])));
      toast.success(`${rows.length} barcode${rows.length === 1 ? '' : 's'} sent to ${target}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not print barcodes');
    } finally {
      setPrinting(false);
    }
  };

  /**
   * Activates the roll whose barcode was scanned.
   */
  const onScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const code = scan.trim();
    if (!code) return;
    const found = rolls.find((roll) => roll.barcode === code || roll.rollCode === code);
    if (!found) {
      toast.error('Scanned barcode does not match this order');
      return;
    }
    setActiveId(found.id);
    setScrollKey(`${found.id}|${Date.now()}`);
    setScan('');
    toast.success(found.rollCode || found.barcode);
  };

  return (
    <RequireCrudPermission path="Fabric / Receipts" action="read">
      <Toaster position="top-right" />
      <div className="main-content !px-4 !py-4 sm:!px-6 sm:!py-5">
      <div className="space-y-5 rounded-md border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/store/po-received" aria-label="Back to PO received" className="rounded border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50">
              <i className="ri-arrow-left-line" aria-hidden />
            </Link>
            <span className="h-5 w-[3px] rounded bg-primary" aria-hidden />
            <h1 className="text-sm font-bold text-gray-800">Process Order</h1>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{order?.number || '…'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-1 text-[10px] font-semibold ${qzConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
              {qzConnected ? `QZ Tray · ${printer}` : 'QZ Tray offline'}
            </span>
            <button type="button" className="rounded border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 disabled:opacity-50" disabled={connecting} onClick={connect}>
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={printing || !rolls.length} onClick={() => printLabels(rolls)} aria-label="Print all barcodes with QZ Tray">
              <i className={printing ? 'ri-loader-4-line animate-spin' : 'ri-printer-line'} aria-hidden />
              {printing ? 'Printing…' : 'Print all barcodes'}
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 disabled:opacity-50" disabled={!rolls.length} onClick={() => openPreview(rolls)} aria-label="Preview barcodes on A4">
              <i className="ri-printer-line" aria-hidden />
              A4 preview
            </button>
          </div>
        </header>

        {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}

        {order ? (
          <section className="grid grid-cols-2 gap-x-6 gap-y-4 rounded border border-gray-200 bg-gray-50 p-4 md:grid-cols-4 md:p-5">
            <Detail label="PO number" value={order.number} />
            <Detail label="Supplier" value={order.supplierName} />
            <Detail label="Status" value={order.status} />
            <Detail label="Total amount" value={formatInr(orderTotal(order.lines))} />
            <Detail label="Total items" value={String(order.lines?.length || 0)} />
            <Detail label="Total quantity" value={`${receivedQty.toLocaleString('en-IN')} ${unit}`.trim()} />
            <Detail label="Rolls" value={String(rolls.length)} />
          </section>
        ) : null}

        {order ? (
          <section className="rounded border border-gray-200 bg-white">
            <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-gray-700" aria-expanded={itemsOpen} onClick={() => setItemsOpen((open) => !open)}>
              Order items summary
              <i className={itemsOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} aria-hidden />
            </button>
            {itemsOpen ? (
              <div className="overflow-x-auto border-t border-gray-200">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                      {['Fabric', 'Sort No', 'Type', 'Color', 'Ordered', 'Received', 'Rate'].map((label) => (
                        <th key={label} className="px-3 py-2 text-left">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(order.lines || []).map((line) => {
                      const received = (order.receivedLots || []).reduce(
                        (sum, lot) => sum + (lot.lines || []).reduce((inner, row) => inner + (row.lineId === line.lineId ? Number(row.receivedQuantity) || 0 : 0), 0),
                        0
                      );
                      return (
                        <tr key={line.lineId} className="border-t border-gray-100">
                          <td className="px-3 py-2">{line.fabricName || '—'}</td>
                          <td className="px-3 py-2">{line.fabricSortNo || '—'}</td>
                          <td className="px-3 py-2">{line.fabricTypeName || '—'}</td>
                          <td className="px-3 py-2">{line.colourName || '—'}</td>
                          <td className="px-3 py-2">{line.quantity} {line.unitName || ''}</td>
                          <td className="px-3 py-2">{received.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2">{formatInr(line.rate || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}

        {order?.notes ? (
          <section className="rounded border border-gray-200 bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Notes</p>
            <p className="text-sm text-gray-800">{order.notes}</p>
          </section>
        ) : null}

        {preview ? <A4BarcodePreview labels={preview} onClose={() => setPreview(null)} /> : null}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Rolls ({rolls.length})</h2>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500" htmlFor="roll-scan">Scan barcode</label>
          <input
            id="roll-scan"
            ref={scanRef}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Scan or enter barcode to activate the row"
            value={scan}
            aria-label="Scan roll barcode"
            onChange={(event) => setScan(event.target.value)}
            onKeyDown={onScan}
          />
          {groups.length ? groups.map(([lotNumber, rows]) => (
            <ProcessLotTable
              key={lotNumber}
              lotNumber={lotNumber}
              rolls={rows}
              lines={order?.lines || []}
              activeId={activeId}
              scrollKey={scrollKey}
              printing={printing}
              onActivate={(roll) => setActiveId(roll.id)}
              onSaved={(saved) => setRolls((current) => current.map((row) => (row.id === saved.id ? { ...row, ...saved } : row)))}
              onPrint={() => printLabels(rows)}
              onBrowserPrint={() => openPreview(rows)}
            />
          )) : <p className="text-sm text-gray-500">No roll barcodes yet. Use Process on the PO received list.</p>}
        </section>
      </div>
      </div>
    </RequireCrudPermission>
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
