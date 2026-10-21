'use client';

import { useEffect, useRef, useState } from 'react';
import { PurchaseOrderRow } from '@/shared/services/factoryApi';

/**
 * Row checkboxes for the purchase-order list.
 * The header checkbox means every order in the current filters, not only this page.
 */
export function usePurchaseOrderSelection(rows: PurchaseOrderRow[], filterKey: string) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const cache = useRef(new Map<string, PurchaseOrderRow>());

  useEffect(() => {
    setSelectAll(false);
    setSelectedIds([]);
    cache.current.clear();
  }, [filterKey]);

  /**
   * Checks or clears every order. Checked means the Excel download includes all filtered orders.
   */
  const onSelectAll = () => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedIds([]);
      cache.current.clear();
      return;
    }
    setSelectAll(true);
    rows.forEach((row) => cache.current.set(row.id, row));
    setSelectedIds(rows.map((row) => row.id));
  };

  /**
   * Toggles one row. Leaving the header checked drops back to the rows still ticked on this page.
   */
  const onSelect = (id: string) => {
    if (selectAll) {
      const remaining = rows.filter((row) => row.id !== id);
      cache.current.clear();
      remaining.forEach((row) => cache.current.set(row.id, row));
      setSelectAll(false);
      setSelectedIds(remaining.map((row) => row.id));
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        cache.current.delete(id);
        return prev.filter((item) => item !== id);
      }
      const row = rows.find((item) => item.id === id);
      if (row) cache.current.set(id, row);
      return [...prev, id];
    });
  };

  /**
   * Drops the current selection after a mutation so deleted orders are not exported.
   */
  const clear = () => {
    setSelectAll(false);
    setSelectedIds([]);
    cache.current.clear();
  };

  /**
   * Orders currently ticked, including rows selected on other pages.
   */
  const selectedRows = () =>
    selectedIds
      .map((id) => cache.current.get(id))
      .filter((row): row is PurchaseOrderRow => Boolean(row));

  return {
    selectedIds,
    selectAll,
    indeterminate: !selectAll && selectedIds.length > 0,
    onSelectAll,
    onSelect,
    clear,
    selectedRows,
  };
}
