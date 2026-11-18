'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { factoryRequest } from '@/shared/services/factoryApi';
import { boxSticker } from '@/shared/components/factory/BoxLabel';
import type { FactorySticker } from '@/shared/components/factory/FactoryStickerPreview';

const scanClass =
  'min-w-0 flex-1 rounded-lg border-2 border-purple-200 bg-purple-50/40 px-4 py-3 font-mono text-sm font-semibold text-gray-900 placeholder:font-sans placeholder:font-normal placeholder:text-gray-400 focus:border-purple-500 focus:bg-white focus:ring-0';

export interface OpenBoxRow {
  id: string;
  barcode: string;
  orderNumber?: string;
  productionOrderId?: string;
  pieceQty: number;
  bundleCount: number;
  scaleWeight: number;
  packingBundleIds: string[];
}

export interface ReadyBoxRow {
  id: string;
  barcode: string;
  status: string;
  pieceQty: number;
  bundleCount: number;
  scaleWeight: number;
  rackCode?: string;
}

const norm = (code: string) => code.trim().replace(/\s+/g, '').toUpperCase();

/**
 * Completed-tab station: scan box → scan packing bundles → see what is in the box.
 */
export function PackIntoBoxStation({
  openBoxes,
  readyForDispatch,
  looseBarcodes,
  onReload,
  onPreview,
}: {
  openBoxes: OpenBoxRow[];
  readyForDispatch: ReadyBoxRow[];
  looseBarcodes: Set<string>;
  onReload: () => Promise<void>;
  onPreview: (sticker: FactorySticker) => void;
}) {
  const [activeBox, setActiveBox] = useState('');
  const [activeDetail, setActiveDetail] = useState<OpenBoxRow | null>(null);
  const [scan, setScan] = useState('');
  const [saving, setSaving] = useState(false);
  const [stationError, setStationError] = useState('');
  const [stationOk, setStationOk] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  const scanPhase: 'box' | 'bundle' = activeBox.trim() ? 'bundle' : 'box';

  const active = useMemo(() => {
    if (activeDetail?.barcode && norm(activeDetail.barcode) === norm(activeBox)) return activeDetail;
    return openBoxes.find((row) => norm(row.barcode) === norm(activeBox));
  }, [openBoxes, activeBox, activeDetail]);

  useEffect(() => {
    if (activeDetail && openBoxes.some((row) => norm(row.barcode) === norm(activeDetail.barcode))) {
      const fresh = openBoxes.find((row) => norm(row.barcode) === norm(activeDetail.barcode));
      if (fresh) setActiveDetail(fresh);
    }
  }, [openBoxes, activeDetail]);

  useEffect(() => {
    if (!activeBox && openBoxes.length === 1) selectBox(openBoxes[0]);
  }, [openBoxes, activeBox]);

  const focusScan = () => scanRef.current?.focus();

  const selectBox = (row: OpenBoxRow) => {
    setActiveBox(row.barcode);
    setActiveDetail(row);
    setStationError('');
    setStationOk(`Box ${row.barcode} is active — scan packing bundles (PB-…).`);
    focusScan();
  };

  const newBox = async () => {
    setSaving(true);
    setStationError('');
    setStationOk('');
    try {
      const box = await factoryRequest<OpenBoxRow>('/warehouse/packing/box/open', { method: 'POST', body: '{}' });
      const shaped: OpenBoxRow = {
        id: String((box as OpenBoxRow).id || ''),
        barcode: box.barcode,
        pieceQty: 0,
        bundleCount: 0,
        scaleWeight: 0,
        packingBundleIds: [],
      };
      selectBox(shaped);
      onPreview(boxSticker({ barcode: shaped.barcode, bundleCount: 0, pieceQty: 0, scaleWeight: 0, orderNumber: shaped.orderNumber }));
      await onReload();
    } catch (err) {
      setStationError(err instanceof Error ? err.message : 'Could not create box');
    } finally {
      setSaving(false);
    }
  };

  const resolveBox = async (code: string) => {
    const local = openBoxes.find((row) => norm(row.barcode) === norm(code));
    if (local) {
      selectBox(local);
      return;
    }
    if (!/^BOX[- ]?/i.test(code)) return;
    const row = await factoryRequest<OpenBoxRow>(`/warehouse/packing/box/lookup?barcode=${encodeURIComponent(code.trim())}`);
    selectBox(row);
    await onReload();
  };

  const addBundle = async (packBarcode: string) => {
    if (!activeBox.trim()) {
      setStationError('Scan a box barcode first (BOX-…).');
      return;
    }
    setSaving(true);
    setStationError('');
    setStationOk('');
    try {
      const result = await factoryRequest<{ box: OpenBoxRow }>('/warehouse/packing/box/add', {
        method: 'POST',
        body: JSON.stringify({ boxBarcode: activeBox.trim(), packingBundleBarcode: packBarcode.trim() }),
      });
      const box = result.box;
      if (box) {
        setActiveDetail(box);
        setStationOk(`Added ${packBarcode} → ${box.barcode}. Scan another PB-… or pick a different box.`);
        onPreview(
          boxSticker({
            barcode: box.barcode,
            bundleCount: box.bundleCount || (box.packingBundleIds || []).length,
            pieceQty: box.pieceQty,
            scaleWeight: box.scaleWeight,
            orderNumber: box.orderNumber,
          })
        );
      }
      await onReload();
      focusScan();
    } catch (err) {
      setStationError(err instanceof Error ? err.message : 'Could not add bundle');
      focusScan();
    } finally {
      setSaving(false);
    }
  };

  const handleScan = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const code = scan.trim();
    if (!code) return;
    setScan('');
    setStationError('');

    const upper = norm(code);

    if (/^BOX[- ]?/i.test(code)) {
      try {
        await resolveBox(code);
      } catch (err) {
        setStationError(err instanceof Error ? err.message : 'Box not found');
        focusScan();
      }
      return;
    }

    if (!activeBox.trim()) {
      setStationError('Scan an open box (BOX-…) or tap New box, then scan the packing bundle.');
      focusScan();
      return;
    }

  const isPack =
      /^PB[- ]?/i.test(code) ||
      looseBarcodes.has(code) ||
      [...looseBarcodes].some((b) => norm(b) === upper);
    if (!isPack) {
      setStationError('Scan a packing bundle barcode (PB-…) from the Packed tab.');
      focusScan();
      return;
    }

    await addBundle(code);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="rounded-xl border-2 border-purple-200 bg-gradient-to-b from-purple-50/80 to-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-700">Scan station</p>
          <button
            type="button"
            className="rounded-lg bg-purple-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
            disabled={saving}
            onClick={() => newBox().catch(() => undefined)}
          >
            + New box
          </button>
        </div>

        {scanPhase === 'bundle' && activeBox ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900" role="status">
            <span className="font-bold">Step 2 —</span> Active box{' '}
            <span className="font-mono font-bold">{activeBox}</span>. Scan each{' '}
            <span className="font-mono font-bold">PB-…</span> packing bundle to place it in this box.
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-purple-100 bg-white/80 px-3 py-2 text-[11px] text-gray-700">
            <span className="font-bold text-gray-900">Step 1 —</span> Scan an open{' '}
            <span className="font-mono font-bold">BOX-…</span> or create <span className="font-bold">New box</span> above.
          </div>
        )}

        <form className="mb-3" onSubmit={(event) => void handleScan(event)}>
          <label className="mb-1 block text-[11px] font-bold text-[#495057]" htmlFor="pk-unified-scan">
            {scanPhase === 'bundle' ? 'Scan packing bundle (PB-…)' : 'Scan box barcode (BOX-…)'}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              ref={scanRef}
              id="pk-unified-scan"
              autoComplete="off"
              className={scanClass}
              placeholder={scanPhase === 'bundle' ? `PB-… → ${activeBox}` : 'BOX-…'}
              value={scan}
              disabled={saving}
              onChange={(event) => setScan(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleScan();
                }
              }}
            />
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-5 py-3 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
              disabled={saving || !scan.trim()}
            >
              {scanPhase === 'bundle' ? 'Add' : 'Select box'}
            </button>
          </div>
        </form>

        <div className="mb-3 flex flex-wrap gap-2">
          {active ? (
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
              onClick={() =>
                onPreview(
                  boxSticker({
                    barcode: active.barcode,
                    bundleCount: active.bundleCount,
                    pieceQty: active.pieceQty,
                    scaleWeight: active.scaleWeight,
                    orderNumber: active.orderNumber,
                  })
                )
              }
            >
              Preview seal label
            </button>
          ) : null}
          {activeBox ? (
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setActiveBox('');
                setActiveDetail(null);
                setStationOk('');
                focusScan();
              }}
            >
              Change box
            </button>
          ) : null}
        </div>

        {stationError ? (
          <p className="mb-2 text-[12px] text-red-600" role="alert">
            {stationError}
          </p>
        ) : null}
        {stationOk ? (
          <p className="mb-2 text-[12px] text-green-700" role="status">
            {stationOk}
          </p>
        ) : null}

        <ActiveBoxCard active={active} activeBox={activeBox} />
      </section>

      <aside className="flex min-h-0 flex-col gap-4">
        <OpenBoxList
          boxes={openBoxes}
          activeBox={activeBox}
          saving={saving}
          onSelect={(row) => selectBox(row)}
        />
        <ReadyDispatchList rows={readyForDispatch} />
      </aside>
    </div>
  );
}

function ActiveBoxCard({ active, activeBox }: { active: OpenBoxRow | undefined; activeBox: string }) {
  if (!active && !activeBox.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 px-4 py-8 text-center">
        <p className="text-[12px] font-bold text-gray-700">No box selected</p>
        <p className="mt-1 text-[11px] text-gray-500">Use New box or scan BOX-…</p>
      </div>
    );
  }

  const bundles = active?.packingBundleIds || [];

  return (
    <div className="rounded-lg border border-purple-200 bg-white p-4 shadow-inner">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Active box</p>
      <p className="font-mono text-lg font-bold text-purple-700">{active?.barcode || activeBox}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-gray-500">Bundles</p>
          <p className="text-lg font-bold text-gray-900">{active?.bundleCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-gray-500">Pieces</p>
          <p className="text-lg font-bold text-gray-900">{active?.pieceQty ?? 0}</p>
        </div>
      </div>
      <p className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">Packing bundles in this box</p>
      {bundles.length ? (
        <ul className="flex flex-wrap gap-2">
          {bundles.map((code) => (
            <li key={code} className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 font-mono text-[11px] font-semibold text-purple-800">
              {code}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-gray-500">Scan PB-… barcodes to place weighed packing bundles here.</p>
      )}
    </div>
  );
}

function OpenBoxList({
  boxes,
  activeBox,
  saving,
  onSelect,
}: {
  boxes: OpenBoxRow[];
  activeBox: string;
  saving: boolean;
  onSelect: (row: OpenBoxRow) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold text-gray-800">Open boxes ({boxes.length})</p>
      {boxes.length ? (
        <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {boxes.map((row) => {
            const selected = norm(row.barcode) === norm(activeBox);
            return (
              <li key={row.id || row.barcode}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSelect(row)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-300' : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-bold text-gray-900">{row.barcode}</span>
                    {selected ? (
                      <span className="rounded bg-purple-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white">Active</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600">
                    {row.bundleCount} bundle{row.bundleCount === 1 ? '' : 's'} · {row.pieceQty} pcs
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-[11px] text-gray-400">No open boxes yet — tap New box.</p>
      )}
    </div>
  );
}

function ReadyDispatchList({ rows }: { rows: ReadyBoxRow[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
        <p className="text-[11px] font-bold text-gray-700">Ready for dispatch</p>
        <p className="mt-1 text-[10px] text-gray-500">
          After seal label, weigh and rack on <Link href="/warehouse/boxes">Boxes</Link>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold text-gray-800">Ready for dispatch ({rows.length})</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="font-mono text-[12px] font-bold text-gray-900">{row.barcode}</p>
            <p className="text-[10px] text-gray-600">
              {row.status} · {row.pieceQty} pcs
              {row.scaleWeight ? ` · ${row.scaleWeight} kg` : ''}
              {row.rackCode ? ` · ${row.rackCode}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}