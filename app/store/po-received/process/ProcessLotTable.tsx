'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { factoryRequest, RollRow } from '@/shared/services/factoryApi';

const head = 'border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500';

/**
 * True when this roll can still be weighed. Returned rolls stay view-only.
 */
export function rollEditable(roll: RollRow): boolean {
  return roll.status !== 'returned-to-vendor';
}

/**
 * Rolls for one received lot: scan to activate, weigh, and print that lot's barcodes.
 */
export function ProcessLotTable({
  lotNumber,
  rolls,
  activeId,
  printing,
  onActivate,
  onSaved,
  onPrint,
}: {
  lotNumber: string;
  rolls: RollRow[];
  activeId: string;
  printing: boolean;
  onActivate: (roll: RollRow) => void;
  onSaved: (roll: RollRow) => void;
  onPrint: () => void;
}) {
  const weighed = rolls.filter((roll) => Number(roll.netWeight) > 0).length;

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
          <span className="text-[10px] text-gray-400">{weighed}/{rolls.length} weighed</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-50"
          disabled={printing}
          onClick={onPrint}
        >
          <i className="ri-printer-line" aria-hidden />
          Print
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              {['Roll id', 'Barcode', 'Fabric', 'Color', 'Lot number', 'Gross wt', 'Net wt', 'Status'].map((label) => (
                <th key={label} className={head}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rolls.map((roll) => (
              <RollRowView
                key={roll.id}
                roll={roll}
                active={roll.id === activeId}
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
 * One roll. The active row accepts gross and net weight.
 */
function RollRowView({
  roll,
  active,
  onActivate,
  onSaved,
}: {
  roll: RollRow;
  active: boolean;
  onActivate: () => void;
  onSaved: (roll: RollRow) => void;
}) {
  const [gross, setGross] = useState(String(roll.grossWeight ?? ''));
  const [net, setNet] = useState(String(roll.netWeight ?? ''));
  const [saving, setSaving] = useState(false);
  const locked = !rollEditable(roll);
  const done = Number(roll.netWeight) > 0;

  /**
   * Persists the weights typed on the active row.
   */
  const save = async () => {
    if (locked) return;
    setSaving(true);
    try {
      const saved = await factoryRequest<RollRow>(`/store/rolls/${roll.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ grossWeight: Number(gross) || 0, netWeight: Number(net) || 0 }),
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
    <tr className={active ? 'bg-primary/5' : 'hover:bg-gray-50'} onClick={onActivate}>
      <td className="border-b border-gray-100 px-3 py-3 font-medium text-primary">{roll.rollCode || roll.id}</td>
      <td className="border-b border-gray-100 px-3 py-3 font-mono text-[11px] text-gray-700">{roll.barcode}</td>
      <td className="border-b border-gray-100 px-3 py-3">{roll.fabricName || '—'}</td>
      <td className="border-b border-gray-100 px-3 py-3">{roll.colourName || '—'}</td>
      <td className="border-b border-gray-100 px-3 py-3">{roll.receivedLotNumber || '—'}</td>
      <td className="border-b border-gray-100 px-3 py-3">
        {active && !locked ? (
          <input aria-label={`${roll.rollCode} gross weight`} inputMode="decimal" className="w-20 rounded border border-gray-300 px-1.5 py-1 text-xs" value={gross} onChange={(event) => setGross(event.target.value.replace(/[^\d.]/g, ''))} onBlur={save} disabled={saving} />
        ) : (roll.grossWeight ?? 0)}
      </td>
      <td className="border-b border-gray-100 px-3 py-3">
        {active && !locked ? (
          <input aria-label={`${roll.rollCode} net weight`} inputMode="decimal" className="w-20 rounded border border-gray-300 px-1.5 py-1 text-xs" value={net} onChange={(event) => setNet(event.target.value.replace(/[^\d.]/g, ''))} onBlur={save} disabled={saving} />
        ) : (roll.netWeight ?? 0)}
      </td>
      <td className="border-b border-gray-100 px-3 py-3">
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
