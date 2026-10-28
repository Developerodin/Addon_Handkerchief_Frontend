'use client';

import React from 'react';
import { PurchaseOrderLine } from '@/shared/services/factoryApi';
import { lineCutoffApproved } from '../purchase-orders/cutoffApproval';
import { emptyGoodsLine, fabricLineLabel, GoodsReceivedLineDraft, GoodsReceivedLotDraft, lineRollTotal, lotIsLocked, lotRollTotal } from './goodsReceivedModel';

const head = 'border border-gray-300 bg-gray-50 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700';
const inputClass = 'w-full border-0 bg-transparent px-1.5 py-1 text-xs text-gray-900 focus:bg-primary/5 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700';

/**
 * One received lot: lot number, rolls, weights, and the PO lines in that lot.
 */
export function GoodsReceivedLotCard({
  index,
  lot,
  lines,
  cutoffs,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  lot: GoodsReceivedLotDraft;
  lines: PurchaseOrderLine[];
  cutoffs: Array<{ fabricId: string; approved: boolean }>;
  canRemove: boolean;
  onChange: (next: GoodsReceivedLotDraft) => void;
  onRemove: () => void;
}) {
  const locked = lotIsLocked(lot);
  const patchLine = (lineIndex: number, next: Partial<GoodsReceivedLineDraft>) => {
    if (locked) return;
    onChange({
      ...lot,
      lines: lot.lines.map((line, i) => (i === lineIndex ? { ...line, ...next } : line)),
    });
  };

  /**
   * Drops an extra PO line. The last line is cleared so the Action cell always has a control.
   */
  const removeLine = (lineIndex: number) => {
    if (locked) return;
    if (lot.lines.length === 1) {
      onChange({ ...lot, lines: [emptyGoodsLine()] });
      return;
    }
    onChange({ ...lot, lines: lot.lines.filter((_, i) => i !== lineIndex) });
  };

  return (
    <section className={`overflow-hidden rounded border border-gray-300 ${locked ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Lot {index + 1}</h3>
          {lot.saved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-800">
              <i className="ri-save-line text-[10px]" aria-hidden />
              Saved
            </span>
          ) : null}
          {lot.saved && lot.editing ? (
            <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
              <i className="ri-edit-box-line text-[10px]" aria-hidden />
              Editing
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {locked ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-gray-400 bg-white px-2 py-1 text-[10px] font-semibold text-gray-800"
              aria-label={`Edit saved lot ${index + 1}`}
              onClick={() => onChange({ ...lot, editing: true })}
            >
              <i className="ri-pencil-line" aria-hidden />
              Edit lot
            </button>
          ) : null}
          {canRemove && !locked ? (
            <button type="button" className="text-[11px] font-semibold text-red-600" onClick={onRemove} aria-label={`Remove lot ${index + 1}`}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {locked ? <p className="px-3 pt-1.5 text-[10px] italic text-gray-500">Cannot edit — saved lots are read-only</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {['Lot # *', 'Total rolls', 'Gross wt *', 'Net wt *'].map((label) => (
                <th key={label} className={head}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-0 align-top">
                <input aria-label={`Lot ${index + 1} number`} className={inputClass} value={lot.lotNumber} disabled={locked} onChange={(event) => onChange({ ...lot, lotNumber: event.target.value })} />
                {locked ? <p className="px-1.5 pb-1 text-[10px] text-gray-500">This lot is saved and cannot be edited.</p> : null}
              </td>
              <td className="border border-gray-300 p-0">
                <input aria-label={`Lot ${index + 1} rolls`} inputMode="numeric" className={inputClass} value={String(lotRollTotal(lot))} readOnly disabled />
              </td>
              <td className="border border-gray-300 p-0">
                <input aria-label={`Lot ${index + 1} gross weight`} inputMode="decimal" className={inputClass} value={lot.grossWeight} disabled={locked} onChange={(event) => onChange({ ...lot, grossWeight: event.target.value.replace(/[^\d.]/g, '') })} />
              </td>
              <td className="border border-gray-300 p-0">
                <input aria-label={`Lot ${index + 1} net weight`} inputMode="decimal" className={inputClass} value={lot.netWeight} disabled={locked} onChange={(event) => onChange({ ...lot, netWeight: event.target.value.replace(/[^\d.]/g, '') })} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-300">
        <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
          <p className="text-[10px] font-bold uppercase text-gray-700">PO items *</p>
          {locked && lot.lines.filter((line) => line.lineId).length > 1 && lineRollTotal(lot.lines) === 0 ? (
            <p className="text-[10px] text-amber-800">Edit this lot and enter received rolls on each PO item.</p>
          ) : null}
          {locked ? null : (
            <button
              type="button"
              className="text-[11px] font-semibold text-primary"
              onClick={() => onChange({ ...lot, lines: [...lot.lines, emptyGoodsLine()] })}
            >
              Add PO item
            </button>
          )}
        </div>
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className={head}>PO item *</th>
              <th className={head}>Received qty in meter *</th>
              <th className={head}>Received rolls *</th>
              <th className={head}>Action</th>
            </tr>
          </thead>
          <tbody>
            {lot.lines.map((line, lineIndex) => {
              const taken = new Set(lot.lines.filter((row, rowIndex) => rowIndex !== lineIndex && row.lineId).map((row) => row.lineId));
              return (
                <tr key={`${lot.key}-${lineIndex}`}>
                <td className="border border-gray-300 p-1">
                  <select
                    aria-label={`Lot ${index + 1} PO item ${lineIndex + 1}`}
                    className="w-full bg-transparent px-1 py-1 text-xs disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700"
                    value={line.lineId}
                    disabled={locked}
                    onChange={(event) => patchLine(lineIndex, { lineId: event.target.value })}
                  >
                    <option value="">Select PO line…</option>
                    {lines.map((item) => {
                      const approved = lineCutoffApproved(item, cutoffs);
                      const duplicate = taken.has(item.lineId);
                      return (
                        <option key={item.lineId} value={item.lineId} disabled={!approved || duplicate}>
                          {fabricLineLabel(item)}{approved ? '' : ' — Cutoff not approved'}{duplicate ? ' — Already in this lot' : ''}
                        </option>
                      );
                    })}
                  </select>
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    aria-label={`Lot ${index + 1} received metres ${lineIndex + 1}`}
                    inputMode="decimal"
                    className={inputClass}
                    value={line.receivedQuantity}
                    disabled={locked}
                    onChange={(event) => patchLine(lineIndex, { receivedQuantity: event.target.value.replace(/[^\d.]/g, '') })}
                  />
                </td>
                <td className="border border-gray-300 p-0">
                  <input
                    aria-label={`Lot ${index + 1} received rolls ${lineIndex + 1}`}
                    inputMode="numeric"
                    className={inputClass}
                    value={line.rolls}
                    disabled={locked}
                    onChange={(event) => patchLine(lineIndex, { rolls: event.target.value.replace(/[^\d]/g, '') })}
                  />
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                    aria-label={`Remove PO item ${lineIndex + 1}`}
                    disabled={locked}
                    onClick={() => removeLine(lineIndex)}
                  >
                    <i className="ri-delete-bin-line" aria-hidden />
                    Remove
                  </button>
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
