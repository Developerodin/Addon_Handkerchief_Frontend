'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { factoryRequest, PageResult, PurchaseOrderLine, PurchaseOrderRow, RollRow } from '@/shared/services/factoryApi';
import { formatInr } from '../../../purchase-orders/add/purchaseOrderFormModel';
import { orderTotal, rollSortNo } from '../../goodsReceivedModel';
import { ProcessLotTable } from '../ProcessLotTable';
import { RollPrintPickModal } from '../RollPrintPickModal';
import { RollPrintSettingsModal } from '../RollPrintSettingsModal';
import { getFabricCatalog } from '@/shared/services/fabricCatalogService';
import { connectQz, isQzConnected, RollLabel } from '@/shared/utils/qzRollPrint';

/**
 * Count is stored on the fabric catalog, not the PO line. A failed lookup leaves that cell blank.
 */
async function countsByFabric(lines: PurchaseOrderLine[]): Promise<Record<string, string>> {
  const ids = [...new Set(lines.map((line) => line.fabricId).filter((id): id is string => Boolean(id)))];
  const counts: Record<string, string> = {};
  await Promise.all(ids.map(async (id) => {
    try {
      const fabric = await getFabricCatalog(id);
      counts[id] = fabric.countName || '';
    } catch {
      counts[id] = '';
    }
  }));
  return counts;
}

/**
 * Turns a roll into the 100×100 mm label.
 * Fabric, colour, and sort come from the PO item stamped on the roll.
 */
function labelFor(
  roll: RollRow,
  lines: PurchaseOrderLine[] = [],
  extras: { supplierName?: string; poNumber?: string; countByFabricId?: Record<string, string> } = {},
): RollLabel {
  const line = (lines || []).find((item) => item.lineId === roll.lineId);
  const fabricId = line?.fabricId || '';
  return {
    barcode: roll.barcode,
    rollCode: roll.rollCode || roll.barcode,
    lotNumber: roll.receivedLotNumber || '',
    fabricName: roll.fabricName || line?.fabricName || '',
    colourName: roll.colourName || line?.colourName || '',
    sortNo: rollSortNo(roll.lineId, lines),
    fabricType: line?.fabricTypeName || '',
    countName: fabricId ? extras.countByFabricId?.[fabricId] || '' : '',
    poNumber: roll.poNumber || extras.poNumber || '',
    supplierName: extras.supplierName || '',
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
  const [itemsOpen, setItemsOpen] = useState(false);
  const [pickRolls, setPickRolls] = useState<RollRow[] | null>(null);
  const [settingsLabels, setSettingsLabels] = useState<RollLabel[] | null>(null);
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
   * Builds labels for the chosen rolls, including fabric count.
   */
  const labelsFor = async (rows: RollRow[]): Promise<RollLabel[]> => {
    const lines = order?.lines || [];
    const countByFabricId = await countsByFabric(lines);
    return rows.map((roll) => labelFor(roll, lines, {
      supplierName: order?.supplierName || '',
      poNumber: order?.number || '',
      countByFabricId,
    }));
  };

  /**
   * Opens print settings for the chosen rolls. The preview is inside that dialog.
   */
  const openSettings = async (rows: RollRow[]) => {
    try {
      const labels = await labelsFor(rows);
      setPickRolls(null);
      setSettingsLabels(labels);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not prepare labels');
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
            <button type="button" className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={!rolls.length} onClick={() => setPickRolls(rolls)} aria-label="Choose roll barcodes to print">
              <i className="ri-printer-line" aria-hidden />
              Print all barcodes
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

        {pickRolls ? (
          <RollPrintPickModal
            rolls={pickRolls}
            onClose={() => setPickRolls(null)}
            onPrint={openSettings}
          />
        ) : null}
        {settingsLabels ? (
          <RollPrintSettingsModal labels={settingsLabels} onClose={() => setSettingsLabels(null)} />
        ) : null}

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
              printing={false}
              onActivate={(roll) => setActiveId(roll.id)}
              onSaved={(saved) => setRolls((current) => current.map((row) => (row.id === saved.id ? { ...row, ...saved } : row)))}
              onPrint={() => setPickRolls(rows)}
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
