'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { factoryRequest, PurchaseOrderRow, RollRow, VendorReturnRow } from '@/shared/services/factoryApi';

interface ReturnQueue {
  orders: PurchaseOrderRow[];
  rolls: RollRow[];
}

/**
 * Pick a PO, scan rejected rolls, and finalize a return challan.
 */
export function PoReturnWorkspace() {
  const search = useSearchParams();
  const [queue, setQueue] = useState<ReturnQueue>({ orders: [], rolls: [] });
  const [poId, setPoId] = useState(search.get('poId') || '');
  const lotFilter = search.get('lot') || '';
  const [scan, setScan] = useState('');
  const [staged, setStaged] = useState<RollRow[]>([]);
  const [reason, setReason] = useState<'rejected' | 'excess' | 'wrong'>('rejected');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /**
   * Reloads purchase orders that still have rejected rolls.
   */
  const load = async () => {
    const data = await factoryRequest<ReturnQueue>('/store/return-queue');
    setQueue({ orders: data.orders || [], rolls: data.rolls || [] });
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load returns'));
  }, []);

  const rolls = useMemo(() => {
    return queue.rolls.filter((roll) => roll.poId === poId && (!lotFilter || roll.receivedLotNumber === lotFilter));
  }, [queue.rolls, poId, lotFilter]);

  /**
   * Stages a rejected roll from the selected PO.
   */
  const addScan = (event: React.FormEvent) => {
    event.preventDefault();
    const code = scan.trim();
    const found = rolls.find((roll) => roll.barcode === code || roll.rollCode === code);
    if (!found) {
      toast.error('That roll is not a rejected roll on this PO');
      return;
    }
    setStaged((current) => (current.some((roll) => roll.id === found.id) ? current : [...current, found]));
    setScan('');
  };

  /**
   * Writes the challan for the staged rolls.
   */
  const finalize = async () => {
    setSaving(true);
    setError('');
    try {
      const row = await factoryRequest<VendorReturnRow>('/store/vendor-returns', {
        method: 'POST',
        body: JSON.stringify({ poId, rollBarcodes: staged.map((roll) => roll.barcode), reason, remarks }),
      });
      toast.success(row.challanNumber || 'Return saved');
      setStaged([]);
      setRemarks('');
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not finalize the return';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-[10px] font-bold uppercase text-gray-500" htmlFor="return-po">Purchase order</label>
      <select id="return-po" aria-label="Purchase order" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={poId} onChange={(event) => { setPoId(event.target.value); setStaged([]); }}>
        <option value="">Select a purchase order</option>
        {queue.orders.map((order) => (
          <option key={order.id} value={order.id}>{order.number} · {order.supplierName}</option>
        ))}
      </select>
      {lotFilter ? <p className="text-[11px] text-gray-500">Filtered to lot {lotFilter}.</p> : null}
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      {poId ? (
        <>
          <form className="flex gap-2" onSubmit={addScan}>
            <input aria-label="Scan rejected roll" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Scan rejected roll" value={scan} onChange={(event) => setScan(event.target.value)} />
            <button type="submit" className="rounded bg-primary px-3 py-2 text-xs font-bold text-white">Add</button>
          </form>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  {['Roll', 'Barcode', 'Lot', 'In session'].map((label) => (
                    <th key={label} className="border border-gray-200 px-2 py-2 text-left">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rolls.map((roll) => (
                  <tr key={roll.id}>
                    <td className="border border-gray-200 px-2 py-2">{roll.rollCode || '—'}</td>
                    <td className="border border-gray-200 px-2 py-2 font-mono">{roll.barcode}</td>
                    <td className="border border-gray-200 px-2 py-2">{roll.receivedLotNumber || '—'}</td>
                    <td className="border border-gray-200 px-2 py-2">{staged.some((row) => row.id === roll.id) ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rolls.length ? <p className="text-sm text-gray-500">No rejected rolls are waiting on this PO.</p> : null}
          <label className="block text-[10px] font-bold uppercase text-gray-500" htmlFor="return-reason">Reason</label>
          <select id="return-reason" aria-label="Reason" className="rounded border border-gray-300 px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value as 'rejected' | 'excess' | 'wrong')}>
            <option value="rejected">Rejected</option>
            <option value="excess">Excess</option>
            <option value="wrong">Wrong</option>
          </select>
          <label className="block text-[10px] font-bold uppercase text-gray-500" htmlFor="return-remarks">Remarks</label>
          <textarea id="return-remarks" aria-label="Remarks" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          <ul className="space-y-1">
            {staged.map((roll) => (
              <li key={roll.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-xs">
                <span>{roll.rollCode || roll.barcode}</span>
                <button type="button" className="font-bold text-red-600" aria-label={`Remove ${roll.rollCode || roll.barcode}`} onClick={() => setStaged((current) => current.filter((row) => row.id !== roll.id))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="rounded bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={saving || !staged.length} onClick={finalize}>
            {saving ? 'Saving…' : 'Finalize challan'}
          </button>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-gray-500">Select a purchase order with rejected rolls.</p>
      )}
    </div>
  );
}
