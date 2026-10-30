'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { factoryRequest, PurchaseOrderLine, RollRow } from '@/shared/services/factoryApi';
import { rollSortNo } from '../goodsReceivedModel';

const head = 'border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500';

/**
 * True when received gross, net, and meters can still be edited.
 * An issued roll stays locked even after the leftover comes back.
 */
export function rollEditable(roll: RollRow): boolean {
  if (roll.receivedLocked) return false;
  return roll.status !== 'returned-to-vendor' && roll.status !== 'issued' && roll.status !== 'on-floor';
}

/**
 * Received balance is complete only when gross, net, and meters are all above zero.
 */
function receivedComplete(roll: RollRow): boolean {
  return Number(roll.grossWeight) > 0 && Number(roll.netWeight) > 0 && Number(roll.qtyMeters) > 0;
}

/**
 * Finds the nearest ancestor that actually scrolls vertically.
 * `overflow-x-auto` computes overflow-y to auto, so height must exceed the box.
 */
function scrollParent(node: HTMLElement): HTMLElement | null {
  let parent = node.parentElement;
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    const scrolls = (overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight + 24;
    if (scrolls) return parent;
    parent = parent.parentElement;
  }
  return null;
}

/**
 * Moves the scanned row to the middle of the viewport.
 * Window scroll is used when the page itself is the scroller.
 */
function scrollRowIntoView(row: HTMLElement) {
  const rect = row.getBoundingClientRect();
  const scroller = scrollParent(row);
  if (!scroller) {
    const top = rect.top + window.scrollY - window.innerHeight / 2 + rect.height / 2;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    return;
  }
  const parentRect = scroller.getBoundingClientRect();
  const top = scroller.scrollTop + (rect.top - parentRect.top) - scroller.clientHeight / 2 + rect.height / 2;
  scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

/**
 * Cell paint for a roll row. Background has to live on the cells: border-collapse drops tr backgrounds.
 */
function rollCellClass(active: boolean, extra = ''): string {
  const tone = active ? 'border-violet-300 bg-violet-100' : 'border-gray-100 group-hover:bg-gray-50';
  return `border-b px-3 py-3 ${tone} ${extra}`.trim();
}

/**
 * Rolls for one received lot: scan to activate, weigh, and print that lot's barcodes.
 */
export function ProcessLotTable({
  lotNumber,
  rolls,
  lines,
  activeId,
  scrollKey,
  printing,
  onActivate,
  onSaved,
  onPrint,
}: {
  lotNumber: string;
  rolls: RollRow[];
  lines: PurchaseOrderLine[];
  activeId: string;
  scrollKey: string;
  printing: boolean;
  onActivate: (roll: RollRow) => void;
  onSaved: (roll: RollRow) => void;
  onPrint: () => void;
}) {
  const weighed = rolls.filter((roll) => receivedComplete(roll)).length;

  return (
    <section className="overflow-hidden rounded border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-800">Lot number: {lotNumber}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <i className="ri-check-line" aria-hidden />
            Accepted
          </span>
          <span className="text-[10px] text-gray-500">({rolls.length} roll{rolls.length === 1 ? '' : 's'})</span>
          <span className="text-[10px] text-gray-400">{weighed}/{rolls.length} complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-50"
            disabled={printing}
            onClick={onPrint}
            aria-label={`Print lot ${lotNumber} with QZ Tray`}
          >
            <i className="ri-printer-line" aria-hidden />
            Print
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              {['Roll id', 'Barcode', 'Fabric', 'Sort No', 'Color', 'Lot number', 'Gross wt', 'Net wt', 'Qty (m)', 'Status'].map((label) => (
                <th key={label} className={head}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rolls.map((roll) => (
              <RollRowView
                key={roll.id}
                roll={roll}
                sortNo={rollSortNo(roll.lineId, lines)}
                active={roll.id === activeId}
                scrollKey={scrollKey}
                onActivate={() => onActivate(roll)}
                onSaved={onSaved}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * One roll. The active row accepts received gross, net, and meters.
 */
function RollRowView({
  roll,
  sortNo,
  active,
  scrollKey,
  onActivate,
  onSaved,
}: {
  roll: RollRow;
  sortNo: string;
  active: boolean;
  scrollKey: string;
  onActivate: () => void;
  onSaved: (roll: RollRow) => void;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [gross, setGross] = useState(String(roll.grossWeight ?? ''));
  const [net, setNet] = useState(String(roll.netWeight ?? ''));
  const [meters, setMeters] = useState(String(roll.qtyMeters ?? ''));
  const [saving, setSaving] = useState(false);
  const locked = !rollEditable(roll);
  const done = receivedComplete(roll);

  useEffect(() => {
    setGross(String(roll.grossWeight ?? ''));
    setNet(String(roll.netWeight ?? ''));
    setMeters(String(roll.qtyMeters ?? ''));
  }, [roll.id, roll.grossWeight, roll.netWeight, roll.qtyMeters]);

  useEffect(() => {
    const [targetId] = scrollKey.split('|');
    if (targetId !== roll.id || !rowRef.current) return;
    scrollRowIntoView(rowRef.current);
  }, [scrollKey, roll.id]);

  /**
   * Persists the weights typed on the active row.
   */
  const save = async () => {
    if (locked) return;
    setSaving(true);
    try {
      const saved = await factoryRequest<RollRow>(`/store/rolls/${roll.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          grossWeight: Number(gross) || 0,
          netWeight: Number(net) || 0,
          qtyMeters: Number(meters) || 0,
        }),
      });
      onSaved(saved);
      toast.success(`${roll.rollCode || roll.barcode} weighed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save roll weight');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr
      ref={rowRef}
      id={`roll-row-${roll.id}`}
      className="group"
      aria-selected={active}
      onClick={onActivate}
    >
      <td className={rollCellClass(active, `font-medium text-primary ${active ? 'shadow-[inset_4px_0_0_#6d28d9]' : ''}`)}>{roll.rollCode || roll.id}</td>
      <td className={rollCellClass(active, 'font-mono text-[11px] text-gray-700')}>{roll.barcode}</td>
      <td className={rollCellClass(active)}>{roll.fabricName || '—'}</td>
      <td className={rollCellClass(active)}>{sortNo || '—'}</td>
      <td className={rollCellClass(active)}>{roll.colourName || '—'}</td>
      <td className={rollCellClass(active)}>{roll.receivedLotNumber || '—'}</td>
      <td className={rollCellClass(active)}>
        {active && !locked ? (
          <input aria-label={`${roll.rollCode} gross weight`} inputMode="decimal" className="w-20 rounded border border-gray-300 px-1.5 py-1 text-xs" value={gross} onChange={(event) => setGross(event.target.value.replace(/[^\d.]/g, ''))} onBlur={save} disabled={saving} />
        ) : (roll.grossWeight ?? 0)}
      </td>
      <td className={rollCellClass(active)}>
        {active && !locked ? (
          <input aria-label={`${roll.rollCode} net weight`} inputMode="decimal" className="w-20 rounded border border-gray-300 px-1.5 py-1 text-xs" value={net} onChange={(event) => setNet(event.target.value.replace(/[^\d.]/g, ''))} onBlur={save} disabled={saving} />
        ) : (roll.netWeight ?? 0)}
      </td>
      <td className={rollCellClass(active)}>
        {active && !locked ? (
          <input aria-label={`${roll.rollCode} quantity in meters`} inputMode="decimal" className="w-20 rounded border border-gray-300 px-1.5 py-1 text-xs" value={meters} onChange={(event) => setMeters(event.target.value.replace(/[^\d.]/g, ''))} onBlur={save} disabled={saving} />
        ) : (roll.qtyMeters ?? 0)}
      </td>
      <td className={rollCellClass(active)}>
        {locked ? (
          <span className="text-[10px] font-semibold text-gray-500">View only</span>
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {done ? 'Completed' : 'Pending'}
          </span>
        )}
      </td>
    </tr>
  );
}
