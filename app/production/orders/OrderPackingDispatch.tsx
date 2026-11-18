'use client';

import Link from 'next/link';
import React from 'react';
import { DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import type { OrderDetail } from '@/shared/services/factoryApi';
import { dispatchStatusLabel } from './orderLabels';

const boxStatusLabel = (status: string) => {
  if (status === 'ready-for-dispatch') return 'Ready for dispatch';
  if (status === 'on-rack') return 'On rack';
  if (status === 'dispatched') return 'Shipped';
  if (status === 'weighed') return 'Weighed';
  if (status === 'open') return 'Open box';
  return status;
};

function MiniTable({
  columns,
  rows,
  empty,
}: {
  columns: { key: string; label: string; render: (row: Record<string, unknown>) => React.ReactNode }[];
  rows: Record<string, unknown>[];
  empty: string;
}) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row, index) => (
            <tr key={String(row.id || row.barcode || index)}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="py-4 text-center text-[11px] text-gray-400">
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/**
 * Packing bundles (PB) and dispatch boxes for one production order.
 */
export function OrderPackingDispatch({ detail }: { detail: OrderDetail }) {
  const packing = detail.packingBundles || [];
  const dispatch = detail.dispatch;
  const summary = dispatch?.order;
  const shipped = dispatch?.dispatched || [];
  const onRack = dispatch?.onRack || [];
  const pipeline = dispatch?.pipeline || [];
  const allBoxes = [...pipeline, ...onRack, ...shipped];

  return (
  <>
    <DrawerSection title="Packing & dispatch summary">
      <div className="grid gap-2 p-3 text-[11px] text-gray-700 md:grid-cols-2">
        <p>
          <span className="font-bold text-gray-800">Factory dispatch:</span>{' '}
          {summary
            ? `${summary.dispatchedQty}/${summary.targetQty} pcs · ${dispatchStatusLabel(summary.dispatchStatus)}`
            : `${orderDispatchFallback(detail)}`}
        </p>
        <p>
          <span className="font-bold text-gray-800">Packing bundles:</span> {packing.length} PB
          {packing.filter((row) => row.onPackingRack).length ? ` · ${packing.filter((row) => row.onPackingRack).length} on rack` : ''}
        </p>
        <p>
          <span className="font-bold text-gray-800">Boxes:</span> {allBoxes.length}
          {onRack.length ? ` · ${onRack.length} on dispatch rack` : ''}
          {pipeline.length ? ` · ${pipeline.length} in pipeline` : ''}
        </p>
        <p className="flex flex-wrap gap-2">
          <Link href="/warehouse/packing" className="font-bold text-purple-700 hover:underline">
            Open packing
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/warehouse/dispatch" className="font-bold text-purple-700 hover:underline">
            Open dispatch
          </Link>
        </p>
      </div>
    </DrawerSection>

    <DrawerSection title={`Packing bundles (${packing.length})`}>
      <MiniTable
        empty="No packing bundles yet — scan production bundles on the packing floor."
        rows={packing}
        columns={[
          { key: 'barcode', label: 'PB barcode', render: (row) => <span className="font-mono font-bold">{String(row.barcode)}</span> },
          { key: 'qty', label: 'Pcs', render: (row) => row.qty },
          {
            key: 'place',
            label: 'Location',
            render: (row) => {
              const box = String(row.boxBarcode || '');
              if (box) return <span className="font-mono">Box {box}</span>;
              if (row.onPackingRack) return 'Packing rack';
              return '—';
            },
          },
          {
            key: 'prod',
            label: 'From BD',
            render: (row) => (row.pieceBundleBarcode ? <span className="font-mono text-[10px]">{String(row.pieceBundleBarcode)}</span> : '—'),
          },
        ]}
      />
    </DrawerSection>

    <DrawerSection title={`Dispatch boxes (${allBoxes.length})`}>
      <MiniTable
        empty="No boxes for this order yet."
        rows={allBoxes}
        columns={[
          { key: 'barcode', label: 'Box', render: (row) => <span className="font-mono font-bold">{String(row.barcode)}</span> },
          { key: 'status', label: 'Status', render: (row) => boxStatusLabel(String(row.status || '')) },
          { key: 'bundles', label: 'PBs', render: (row) => row.bundleCount ?? '—' },
          { key: 'pcs', label: 'Pcs', render: (row) => row.pieceQty ?? 0 },
          { key: 'kg', label: 'Kg', render: (row) => (Number(row.scaleWeight) ? row.scaleWeight : '—') },
          { key: 'rack', label: 'Rack / vehicle', render: (row) => {
            const rack = String(row.rackCode || '');
            const vehicle = String(row.vehicleNumber || '');
            if (row.status === 'dispatched' && vehicle) return <span className="font-mono text-[10px]">{vehicle}</span>;
            return rack || '—';
          } },
        ]}
      />
    </DrawerSection>
  </>
  );
}

function orderDispatchFallback(detail: OrderDetail) {
  const o = detail.order;
  const dispatched = o.dispatchedQty ?? 0;
  const target = o.totalQty || o.targetQty || 0;
  return `${dispatched}/${target} pcs · ${dispatchStatusLabel(o.dispatchStatus)}`;
}