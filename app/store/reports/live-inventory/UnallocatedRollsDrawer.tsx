'use client';

import React, { useEffect, useState } from 'react';
import { DrawerSection, FactoryDrawer } from '@/shared/components/factory/FactoryDrawer';
import { formatQty } from '../ReportTable';
import { LiveInventoryRow, UnallocatedRoll, loadUnallocatedRolls } from './liveInventory';

interface UnallocatedRollsDrawerProps {
  fabric: LiveInventoryRow | null;
  onClose: () => void;
}

/**
 * Received rolls for one fabric. These metres are inward stock that is not on a rack.
 */
export function UnallocatedRollsDrawer({ fabric, onClose }: UnallocatedRollsDrawerProps) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UnallocatedRoll[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fabric) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    loadUnallocatedRolls(fabric.fabricId, page)
      .then((data) => {
        if (cancelled) return;
        setRows(data.results || []);
        setTotal(data.totalResults || 0);
        setTotalPages(data.totalPages || 0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRows([]);
        setError(err instanceof Error ? err.message : 'Could not load unallocated rolls');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fabric, page]);

  useEffect(() => {
    if (!fabric) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fabric, onClose]);

  return (
    <FactoryDrawer
      open={Boolean(fabric)}
      title={fabric ? fabric.fabricName : 'Unallocated'}
      subtitle={fabric ? `${formatQty(fabric.unallocatedMeters)} m received, not stored` : undefined}
      onClose={onClose}
    >
      <DrawerSection title="Received rolls">
        {error ? (
          <p className="px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="px-3 py-4 text-xs font-bold uppercase text-gray-400">Loading rolls</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-500">No received rolls for this fabric.</p>
        ) : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Barcode', 'Lot', 'PO', 'Metres', 'Net kg'].map((label) => (
                    <th key={label} scope="col" className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-500">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((roll) => (
                  <tr key={roll.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">{roll.barcode || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{roll.lot || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{roll.poNumber || '—'}</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-gray-800">{formatQty(roll.meters)}</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-gray-800">{formatQty(roll.netKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2">
            <p className="text-[11px] text-gray-500">{formatQty(total)} rolls</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-2 py-1 text-[11px] font-bold disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded border border-gray-300 px-2 py-1 text-[11px] font-bold disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </DrawerSection>
    </FactoryDrawer>
  );
}
