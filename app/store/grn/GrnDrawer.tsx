'use client';

import React, { useState } from 'react';
import { factoryRequest, PurchaseOrderRow, ReceiptRow, RollRow } from '@/shared/services/factoryApi';
import { downloadFabricGrn, printFabricGrn } from './grnDocument';

interface GrnDetail {
  grn: ReceiptRow;
  rolls: RollRow[];
  order: PurchaseOrderRow | null;
}

export interface GrnDrawerProps {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * GRN overview, lots, rolls, and an editable operational header.
 */
export function GrnDrawer({ id, onClose, onSaved }: GrnDrawerProps) {
  const [detail, setDetail] = useState<GrnDetail | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'overview' | 'lots' | 'rolls'>('overview');
  const [busy, setBusy] = useState<'print' | 'download' | ''>('');

  React.useEffect(() => {
    factoryRequest<GrnDetail>(`/store/receipts/${id}`)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load GRN'));
  }, [id]);

  /**
   * Saves the header fields that live on the receipt.
   */
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const grn = await factoryRequest<ReceiptRow>(`/store/receipts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          receivedDate: String(form.get('receivedDate') || ''),
          receiver: String(form.get('receiver') || ''),
          condition: String(form.get('condition') || ''),
          notes: String(form.get('notes') || ''),
          grossWeight: Number(form.get('grossWeight') || 0),
          netWeight: Number(form.get('netWeight') || 0),
        }),
      });
      setDetail((current) => (current ? { ...current, grn: { ...current.grn, ...grn } } : current));
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save GRN');
    }
  };

  /**
   * Fills the goods-received-note template and either prints or downloads it.
   */
  const output = async (mode: 'print' | 'download') => {
    if (!detail?.grn || busy) return;
    setBusy(mode);
    setError('');
    try {
      const rollsForPrint = detail.rolls || [];
      const order = detail.order || null;
      if (mode === 'print') await printFabricGrn(detail.grn, rollsForPrint, order);
      else await downloadFabricGrn(detail.grn, rollsForPrint, order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not print GRN');
    } finally {
      setBusy('');
    }
  };

  const grn = detail?.grn;
  const rolls = detail?.rolls || [];
  const lots = [...new Set(rolls.map((roll) => roll.receivedLotNumber).filter(Boolean))];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl" aria-label="GRN detail">
        <header className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800">{grn?.number || 'GRN'}</h2>
          <button type="button" className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Close GRN" onClick={onClose}>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>
        <div className="space-y-3 p-4">
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          {!grn ? <p className="text-sm text-gray-500">Loading GRN…</p> : null}
          {grn ? (
            <>
              <div className="flex gap-2" role="tablist" aria-label="GRN sections">
                {(['overview', 'lots', 'rolls'] as const).map((name) => (
                  <button key={name} type="button" role="tab" aria-selected={tab === name} className={`rounded px-2 py-1 text-[11px] font-bold ${tab === name ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setTab(name)}>
                    {name}
                  </button>
                ))}
              </div>
              {tab === 'overview' && !editing ? (
                <div className="space-y-1 text-xs text-gray-700">
                  <p>Supplier {grn.supplierName || '—'}</p>
                  <p>PO {detail?.order?.number || grn.poId}</p>
                  <p>Received {grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString('en-IN') : '—'}</p>
                  <p>Receiver {grn.receiver || '—'}</p>
                  <p>Condition {grn.condition || '—'}</p>
                  <p>Gross {grn.grossWeight ?? 0} · Net {grn.netWeight ?? 0}</p>
                  <p>Notes {grn.notes || '—'}</p>
                </div>
              ) : null}
              {tab === 'overview' && editing ? (
                <form className="grid gap-2 text-xs" onSubmit={save}>
                  <label htmlFor="grn-date">Received date</label>
                  <input id="grn-date" name="receivedDate" type="date" aria-label="Received date" className="rounded border border-gray-300 px-2 py-1.5" defaultValue={grn.receivedDate ? grn.receivedDate.slice(0, 10) : ''} />
                  <label htmlFor="grn-receiver">Receiver</label>
                  <input id="grn-receiver" name="receiver" aria-label="Receiver" className="rounded border border-gray-300 px-2 py-1.5" defaultValue={grn.receiver || ''} />
                  <label htmlFor="grn-condition">Condition</label>
                  <input id="grn-condition" name="condition" aria-label="Condition" className="rounded border border-gray-300 px-2 py-1.5" defaultValue={grn.condition || ''} />
                  <label htmlFor="grn-gross">Gross</label>
                  <input id="grn-gross" name="grossWeight" type="number" step="0.001" aria-label="Gross weight" className="rounded border border-gray-300 px-2 py-1.5" defaultValue={grn.grossWeight ?? 0} />
                  <label htmlFor="grn-net">Net</label>
                  <input id="grn-net" name="netWeight" type="number" step="0.001" aria-label="Net weight" className="rounded border border-gray-300 px-2 py-1.5" defaultValue={grn.netWeight ?? 0} />
                  <label htmlFor="grn-notes">Notes</label>
                  <textarea id="grn-notes" name="notes" aria-label="Notes" className="rounded border border-gray-300 px-2 py-1.5" rows={3} defaultValue={grn.notes || ''} />
                  <div className="flex gap-2">
                    <button type="submit" className="rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white">Save</button>
                    <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-[11px] font-bold" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </form>
              ) : null}
              {tab === 'lots' ? (
                <ul className="space-y-1 text-xs">{lots.map((lot) => <li key={lot} className="rounded border border-gray-200 px-2 py-1">{lot} · {rolls.filter((roll) => roll.receivedLotNumber === lot).length} rolls</li>)}</ul>
              ) : null}
              {tab === 'rolls' ? (
                <ul className="space-y-1 text-xs">{rolls.map((roll) => <li key={roll.id} className="rounded border border-gray-200 px-2 py-1">{roll.rollCode || roll.barcode} · {roll.fabricName || '—'} · {roll.netWeight || 0}</li>)}</ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {!editing ? <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-[11px] font-bold" onClick={() => setEditing(true)}>Edit</button> : null}
                <button type="button" className="rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60" disabled={Boolean(busy)} aria-label="Print goods receipt note" onClick={() => output('print')}>{busy === 'print' ? 'Printing…' : 'Print'}</button>
                <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-[11px] font-bold disabled:opacity-60" disabled={Boolean(busy)} aria-label="Download goods receipt note" onClick={() => output('download')}>{busy === 'download' ? 'Downloading…' : 'Download'}</button>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
