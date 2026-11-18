'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { FloorBundle } from '@/app/production/floor/shared/StationPage';
import { QueueTabs } from '@/app/production/floor/shared/QueueTabs';
import { packingBundleSticker, type PackingBundleLabelRow } from '@/shared/components/factory/PackingBundleLabel';
import { FactoryStickerPreview, type FactorySticker } from '@/shared/components/factory/FactoryStickerPreview';
import { PackIntoBoxStation } from '@/app/warehouse/packing/PackIntoBoxStation';

const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';
const headClass = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase text-[#495057]';
const cellClass = 'border border-gray-200 px-1.5 py-2 text-[12px]';

interface LoosePack {
  id: string;
  barcode: string;
  qty: number;
  scaleWeight: number;
  orderNumber: string;
  pieceBundleBarcode: string;
}

interface OrderPackSummary {
  orderId: string;
  orderNumber: string;
  waitingBundles: number;
  looseBundles: number;
  openBoxes: number;
  piecesWaiting: number;
  piecesPacked: number;
  piecesInOpenBoxes: number;
}

interface OpenBoxRow {
  id: string;
  barcode: string;
  orderNumber?: string;
  pieceQty: number;
  bundleCount: number;
  scaleWeight: number;
  packingBundleIds: string[];
}

interface ReadyBoxRow {
  id: string;
  barcode: string;
  status: string;
  pieceQty: number;
  bundleCount: number;
  scaleWeight: number;
  rackCode?: string;
}

interface PackBoard {
  results: FloorBundle[];
  loose: LoosePack[];
  openBoxes: OpenBoxRow[];
  readyForDispatch: ReadyBoxRow[];
  byOrder?: OrderPackSummary[];
  counts: { waiting: number; onStation: number; openBoxes: number; onRack: number };
}

/**
 * Warehouse packing: piece bundles on racks → weighed packing bundles → scan into boxes → dispatch.
 */
export default function PackingPage() {
  const [board, setBoard] = useState<PackBoard>({
    results: [],
    loose: [],
    openBoxes: [],
    readyForDispatch: [],
    byOrder: [],
    counts: { waiting: 0, onStation: 0, openBoxes: 0, onRack: 0 },
  });
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<FloorBundle | null>(null);
  const [previewSticker, setPreviewSticker] = useState<FactorySticker | null>(null);

  const load = useCallback(async () => {
    const data = await factoryRequest<PackBoard>('/warehouse/packing/upcoming');
    setBoard({
      results: data.results || [],
      loose: data.loose || [],
      openBoxes: data.openBoxes || [],
      readyForDispatch: data.readyForDispatch || [],
      byOrder: data.byOrder || [],
      counts: data.counts || { waiting: 0, onStation: 0, openBoxes: 0, onRack: 0 },
    });
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load packing'));
  }, [load]);

  const byRack = useMemo(() => {
    const map = new Map<string, FloorBundle[]>();
    for (const row of board.results) {
      const rack = row.rackCode || 'No rack';
      const list = map.get(rack) || [];
      list.push(row);
      map.set(rack, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [board.results]);

  const looseBarcodes = useMemo(() => new Set(board.loose.map((row) => row.barcode)), [board.loose]);

  return (
    <RequireCrudPermission path="Packing & Dispatch / Packing" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Packing" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Packing</h1>
            <Link href="/warehouse/boxes" className="ml-auto text-[11px] font-bold text-purple-600">Weigh &amp; rack boxes →</Link>
          </div>
          <form
            className="mb-4 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const match = board.results.find((row) => row.barcode.toLowerCase() === scan.trim().toLowerCase());
              if (!match) setError('This bundle is not on a packing rack');
              else {
                setJob(match);
                setError('');
              }
              setScan('');
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="pkScan">Production bundle</label>
            <input id="pkScan" aria-label="Production bundle barcode" className="w-48 rounded border border-gray-200 px-3 py-1.5 text-[11px]" value={scan} onChange={(event) => setScan(event.target.value)} required />
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">Open</button>
          </form>
          {error ? <p className="mb-3 text-[12px] text-red-600" role="alert">{error}</p> : null}
          {board.byOrder?.length ? (
            <div className="mb-4 overflow-x-auto rounded border border-gray-200">
              <table className="w-full min-w-[520px] border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-50">
                    {['Order', 'On rack', 'Packed PB', 'Open boxes', 'Left to pack'].map((label) => (
                      <th key={label} className="border-b border-gray-200 px-2 py-2 text-left font-bold uppercase text-gray-600">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {board.byOrder.map((row) => (
                    <tr key={row.orderId || row.orderNumber}>
                      <td className="border-b border-gray-100 px-2 py-2 font-mono font-bold text-purple-700">{row.orderNumber}</td>
                      <td className="border-b border-gray-100 px-2 py-2">{row.waitingBundles}</td>
                      <td className="border-b border-gray-100 px-2 py-2">{row.looseBundles} ({row.piecesPacked} pcs)</td>
                      <td className="border-b border-gray-100 px-2 py-2">{row.openBoxes} ({row.piecesInOpenBoxes} pcs)</td>
                      <td className="border-b border-gray-100 px-2 py-2">{row.piecesWaiting}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <QueueTabs
            upcomingCount={board.counts.waiting}
            receivedCount={board.counts.onStation}
            completedCount={board.openBoxes.length}
            completedLabel="Into box"
            receivedLabel="Packed"
            upcomingLabel="On rack"
            upcoming={(
              <div className="space-y-6">
                {byRack.length ? byRack.map(([rack, rows]) => (
                  <section key={rack}>
                    <h2 className="mb-2 text-[12px] font-bold text-gray-800">Rack {rack}</h2>
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50/30">{['Bundle', 'Order', 'Left to pack', 'Good'].map((label) => <th key={label} className={headClass}>{label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id}>
                            <td className={cellClass}><button type="button" className="font-mono font-medium text-purple-600" onClick={() => setJob(row)}>{row.barcode}</button></td>
                            <td className={cellClass}>{row.orderNumber}</td>
                            <td className={cellClass}>{row.finalGood - (row.packedQty || 0)}</td>
                            <td className={cellClass}>{row.finalGood}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )) : <p className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">No bundles are waiting on a packing rack.</p>}
              </div>
            )}
            received={(
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">{['Barcode', 'Pieces', 'Weight (kg)', 'From bundle', ''].map((label) => <th key={label || 'act'} className={headClass}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {board.loose.length ? board.loose.map((row) => (
                    <tr key={row.id}>
                      <td className={`${cellClass} font-mono`}>{row.barcode}</td>
                      <td className={cellClass}>{row.qty}</td>
                      <td className={cellClass}>{row.scaleWeight || '—'}</td>
                      <td className={cellClass}>{row.pieceBundleBarcode}</td>
                      <td className={cellClass}>
                        <button
                          type="button"
                          className="text-[11px] font-bold text-purple-600"
                          onClick={() => {
                            setPreviewSticker(
                              packingBundleSticker({
                                barcode: row.barcode,
                                qty: row.qty,
                                scaleWeight: row.scaleWeight,
                                orderNumber: row.orderNumber,
                              })
                            );
                          }}
                        >
                          Preview label
                        </button>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={5} className="border border-gray-200 py-10 text-center text-[11px] text-gray-400">Pack a bundle from Upcoming first.</td></tr>}
                </tbody>
              </table>
            )}
            completed={(
              <PackIntoBoxStation
                openBoxes={board.openBoxes}
                readyForDispatch={board.readyForDispatch}
                looseBarcodes={looseBarcodes}
                onReload={load}
                onPreview={setPreviewSticker}
              />
            )}
          />
        </div>
        <FactoryStickerPreview
          open={Boolean(previewSticker)}
          sticker={previewSticker}
          onClose={() => setPreviewSticker(null)}
        />
        <PackDrawer
          bundle={job}
          onClose={() => setJob(null)}
          onChanged={load}
          onPacked={(row) => setPreviewSticker(packingBundleSticker(row))}
        />
      </div>
    </RequireCrudPermission>
  );
}

/**
 * Weigh and cut one packing bundle off the production bundle remainder.
 */
function PackDrawer({
  bundle,
  onClose,
  onChanged,
  onPacked,
}: {
  bundle: FloorBundle | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onPacked: (row: PackingBundleLabelRow) => void;
}) {
  const [count, setCount] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const left = bundle ? bundle.finalGood - (bundle.packedQty || 0) : 0;

  useEffect(() => {
    if (!bundle) return;
    const size = bundle.packingSize || 0;
    setCount(String(size > 0 && left >= size ? size : left));
    setWeight('');
    setError('');
  }, [bundle, left]);

  return (
    <FactoryDrawer title="Packing" subtitle={bundle?.barcode} open={Boolean(bundle)} onClose={onClose}>
      <DrawerSection title="Weigh &amp; pack">
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!bundle) return;
            setSaving(true);
            setError('');
            try {
              const created = await factoryRequest<{ barcode: string; qty: number; scaleWeight: number }>('/warehouse/packing/pack', {
                method: 'POST',
                body: JSON.stringify({
                  bundleBarcode: bundle.barcode,
                  pieceCount: Number(count),
                  scaleWeight: Number(weight),
                }),
              });
              onPacked({
                barcode: created.barcode,
                qty: created.qty,
                scaleWeight: Number(created.scaleWeight) || Number(weight),
                orderNumber: bundle.orderNumber,
              });
              onClose();
              await onChanged();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Packing failed');
            } finally {
              setSaving(false);
            }
          }}
        >
          <p className="text-[12px] text-gray-600">
            Rack <span className="font-mono font-bold">{bundle?.rackCode || '—'}</span>. {left} left.
            {bundle?.packingSize
              ? ` Pack ${bundle.packingSize} pcs per bundle, or ${left} for the last pack.`
              : ` No packing bundle qty on the style — pack all ${left} pcs in one bundle, or set Packing Bundle Qty on the style code.`}
          </p>
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="pkCount">Piece count</label>
          <input id="pkCount" aria-label="Piece count" className={fieldClass} inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} required />
          <label className="text-[11px] font-bold text-[#495057]" htmlFor="pkWeight">Scale weight (kg)</label>
          <input id="pkWeight" aria-label="Scale weight" className={fieldClass} inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} required />
          {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
          <button type="submit" className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving}>Pack &amp; print label</button>
        </form>
      </DrawerSection>
    </FactoryDrawer>
  );
}