'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { factoryRequest, PageResult, PurchaseOrderRow, RollRow } from '@/shared/services/factoryApi';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { PurchaseOrderDateBar } from '@/app/store/purchase-orders/purchaseOrderListFilters';
import { defaultQcRange } from '@/app/quality/fabric/fabricQcLots';
import { AllocatedRollTable } from './AllocatedRollTable';
import { isAmountQuery, SelectPurchaseOrderDrawer } from './SelectPurchaseOrderDrawer';

/**
 * Rolls from one purchase order that are already on a rack. Unallocate sends a roll back.
 */
export function AllocatedRolls() {
  const initial = defaultQcRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [poId, setPoId] = useState('');
  const [picked, setPicked] = useState<PurchaseOrderRow | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [loadingRolls, setLoadingRolls] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const orders = useFactoryList<PurchaseOrderRow>('/store/purchase-orders', {
    from,
    to,
    statusIn: 'Partially Received,Received',
  });

  useEffect(() => {
    orders.setLimit(100);
  }, [orders.setLimit]);

  const searchOrders = useCallback((value: string) => {
    orders.setSearch(isAmountQuery(value) ? '' : value.trim());
  }, [orders.setSearch]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    orders.setSearch('');
  }, [orders.setSearch]);

  const selected = orders.rows.find((order) => order.id === poId) || (picked?.id === poId ? picked : null);

  useEffect(() => {
    if (!poId) {
      setRolls([]);
      return;
    }
    let cancelled = false;
    setLoadingRolls(true);
    factoryRequest<PageResult<RollRow>>(`/store/rolls?poId=${poId}&status=stored&withLocation=1&limit=100`)
      .then((data) => {
        if (!cancelled) setRolls(data.results || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load rolls');
      })
      .finally(() => {
        if (!cancelled) setLoadingRolls(false);
      });
    return () => {
      cancelled = true;
    };
  }, [poId]);

  /**
   * Removes the roll from its rack and drops it out of this list.
   */
  const unallocate = async (roll: RollRow) => {
    setBusyId(roll.id);
    setError('');
    try {
      await factoryRequest('/store/racks/unallocate', {
        method: 'POST',
        body: JSON.stringify({ rollBarcode: roll.barcode }),
      });
      setRolls((current) => current.filter((row) => row.id !== roll.id));
      toast.success(`${roll.rollCode || roll.barcode} unallocated`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unallocate this roll');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Allocated rolls</h2>
          <p className="text-[11px] text-gray-500">Pick a purchase order. Rolls on a rack can be unallocated back to the unallocated list.</p>
        </div>
        <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-[11px] font-bold text-gray-700" onClick={() => orders.reload()}>
          Refresh
        </button>
      </div>
      <PurchaseOrderDateBar
        from={from}
        to={to}
        onFromChange={(value) => {
          setFrom(value);
          orders.setPage(1);
        }}
        onToChange={(value) => {
          setTo(value);
          orders.setPage(1);
        }}
        onReset={() => {
          const next = defaultQcRange();
          setFrom(next.from);
          setTo(next.to);
          orders.setPage(1);
        }}
      />
      <label className="block text-[10px] font-bold uppercase text-gray-500" htmlFor="allocated-po">Select purchase order</label>
      <button
        id="allocated-po"
        type="button"
        aria-label="Select a purchase order"
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
        className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm"
        onClick={() => setPickerOpen(true)}
      >
        <span className={selected ? 'truncate text-gray-800' : 'text-gray-500'}>
          {selected ? `${selected.number} · ${selected.supplierName}` : 'Select a purchase order'}
        </span>
        <i className="ri-arrow-down-s-line shrink-0 text-lg text-gray-400" aria-hidden />
      </button>
      <SelectPurchaseOrderDrawer
        open={pickerOpen}
        orders={orders.rows}
        selectedId={poId}
        loading={orders.loading}
        onSearch={searchOrders}
        onSelect={(order) => {
          setLoadingRolls(true);
          setRolls([]);
          setError('');
          setPoId(order.id);
          setPicked(order);
          closePicker();
        }}
        onClose={closePicker}
      />
      {orders.error ? <p className="text-sm text-red-600" role="alert">{orders.error}</p> : null}
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      {!poId ? (
        <div className="py-8 text-center">
          <i className="ri-arrow-down-line text-3xl text-gray-400" aria-hidden />
          <p className="mt-3 text-xs text-gray-500">Please select a purchase order to view allocated rolls.</p>
        </div>
      ) : null}
      {poId ? (
        <div className="mt-4">
          <h3 className="mb-3 text-xs font-bold text-gray-800">Allocated rolls for PO: {selected?.number || '—'}</h3>
          {loadingRolls ? <p className="py-8 text-center text-xs text-gray-500">Loading rolls…</p> : null}
          {!loadingRolls ? <AllocatedRollTable rolls={rolls} busyId={busyId} onUnallocate={unallocate} /> : null}
        </div>
      ) : null}
    </div>
  );
}
