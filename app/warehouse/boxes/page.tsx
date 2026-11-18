'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listProductionRacks, ProductionRack } from '@/shared/services/phase3CatalogService';
import { QueueTabs } from '@/app/production/floor/shared/QueueTabs';
import { boxSticker } from '@/shared/components/factory/BoxLabel';
import { FactoryStickerPreview, type FactorySticker } from '@/shared/components/factory/FactoryStickerPreview';

const fieldClass = 'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';
interface BoxRow {
  id: string;
  barcode: string;
  status: string;
  orderNumber?: string;
  pieceQty: number;
  bundleCount?: number;
  scaleWeight: number;
  rackCode?: string;
  packingBundleIds?: string[];
}

type BoxStep = 'weigh' | 'ready' | 'rack';

/**
 * Weigh → mark ready & print → box rack → dispatch floor.
 */
export default function BoxesPage() {
  const [toWeigh, setToWeigh] = useState<BoxRow[]>([]);
  const [weighed, setWeighed] = useState<BoxRow[]>([]);
  const [ready, setReady] = useState<BoxRow[]>([]);
  const [onRack, setOnRack] = useState<BoxRow[]>([]);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [job, setJob] = useState<BoxRow | null>(null);
  const [step, setStep] = useState<BoxStep>('weigh');
  const [preview, setPreview] = useState<FactorySticker | null>(null);

  const load = useCallback(async () => {
    const data = await factoryRequest<{
      results: BoxRow[];
      active: BoxRow[];
      readyForDispatch: BoxRow[];
      onRack: BoxRow[];
    }>('/warehouse/boxes/upcoming');
    setToWeigh(data.results || []);
    setWeighed(data.active || []);
    setReady(data.readyForDispatch || []);
    setOnRack(data.onRack || []);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load boxes'));
  }, [load]);

  const openRow = (row: BoxRow, next: BoxStep) => {
    setJob(row);
    setStep(next);
    setError('');
  };

  const findAndOpen = (code: string) => {
    const needle = code.trim().toLowerCase();
    const all = [...toWeigh, ...weighed, ...ready];
    const row = all.find((box) => box.barcode.toLowerCase() === needle);
    if (!row) {
      setError('This box is not waiting on this screen — check Packing or Dispatch.');
      return;
    }
    const next: BoxStep = toWeigh.some((b) => b.barcode === row.barcode)
      ? 'weigh'
      : weighed.some((b) => b.barcode === row.barcode)
        ? 'ready'
        : 'rack';
    openRow(row, next);
    setError('');
  };

  return (
    <RequireCrudPermission path="Packing & Dispatch / Boxes" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Boxes" />
        <div className="border border-gray-100 bg-white p-[10px] shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="h-5 w-[3px] rounded-full bg-purple-600" />
            <h1 className="text-sm font-bold text-gray-800">Boxes</h1>
            <Link href="/warehouse/packing" className="ml-auto text-[11px] font-bold text-purple-600">
              ← Packing
            </Link>
            <Link href="/warehouse/dispatch" className="text-[11px] font-bold text-purple-600">
              Dispatch floor →
            </Link>
          </div>

          <ol className="mb-4 grid gap-1 text-[11px] text-gray-600 sm:grid-cols-3">
            <li>
              <span className="font-bold text-gray-900">1. Weigh</span> — box with packing bundles on scale
            </li>
            <li>
              <span className="font-bold text-gray-900">2. Ready</span> — print seal label, mark ready
            </li>
            <li>
              <span className="font-bold text-gray-900">3. Rack</span> — scan box onto box rack (shows on Dispatch)
            </li>
          </ol>

          <form
            className="mb-4 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              findAndOpen(scan);
              setScan('');
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="bxScan">
              Scan box
            </label>
            <input
              id="bxScan"
              aria-label="Box barcode"
              className="w-52 rounded border border-gray-200 px-3 py-1.5 font-mono text-[11px]"
              value={scan}
              onChange={(event) => setScan(event.target.value)}
            />
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white">
              Open
            </button>
          </form>

          {error ? (
            <p className="mb-3 text-[12px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <QueueTabs
            upcomingCount={toWeigh.length}
            receivedCount={weighed.length}
            completedCount={ready.length + onRack.length}
            upcomingLabel="Weigh"
            receivedLabel="Seal & print"
            completedLabel="Box rack"
            upcoming={<BoxCards rows={toWeigh} empty="No box is waiting to be weighed. Finish Packing → Into box first." action="Weigh" onOpen={(row) => openRow(row, 'weigh')} />}
            received={<BoxCards rows={weighed} empty="Weigh a box first." action="Mark ready" onOpen={(row) => openRow(row, 'ready')} />}
            completed={(
              <div className="space-y-4">
                <section>
                  <h2 className="mb-2 text-[11px] font-bold text-gray-800">Ready — put on rack ({ready.length})</h2>
                  <BoxCards rows={ready} empty="Mark a weighed box ready and print its label." action="Put on rack" onOpen={(row) => openRow(row, 'rack')} />
                </section>
                <section>
                  <h2 className="mb-2 text-[11px] font-bold text-gray-800">On dispatch floor ({onRack.length})</h2>
                  <BoxCards rows={onRack} empty="No box on a rack yet." action="View" onOpen={() => undefined} readOnly />
                  {onRack.length ? (
                    <p className="mt-2 text-[10px] text-gray-500">
                      Ship from{' '}
                      <Link href="/warehouse/dispatch" className="font-bold text-purple-600">
                        Dispatch
                      </Link>
                      .
                    </p>
                  ) : null}
                </section>
              </div>
            )}
          />
        </div>

        <FactoryStickerPreview open={Boolean(preview)} sticker={preview} onClose={() => setPreview(null)} />

        <BoxDrawer
          box={job}
          step={step}
          onClose={() => setJob(null)}
          onChanged={load}
          onPreview={setPreview}
        />
      </div>
    </RequireCrudPermission>
  );
}

function BoxCards({
  rows,
  empty,
  action,
  onOpen,
  readOnly,
}: {
  rows: BoxRow[];
  empty: string;
  action: string;
  onOpen: (row: BoxRow) => void;
  readOnly?: boolean;
}) {
  if (!rows.length) {
    return <p className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-[11px] text-gray-400">{empty}</p>;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <li key={row.id || row.barcode}>
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <p className="font-mono text-[13px] font-bold text-gray-900">{row.barcode}</p>
            {row.orderNumber ? <p className="text-[11px] font-bold text-purple-700">Order {row.orderNumber}</p> : null}
            <p className="mt-1 text-[11px] text-gray-600">
              {row.bundleCount ?? row.packingBundleIds?.length ?? 0} bundles · {row.pieceQty} pcs
              {row.scaleWeight ? ` · ${row.scaleWeight} kg` : ''}
              {row.rackCode ? ` · ${row.rackCode}` : ''}
            </p>
            {!readOnly ? (
              <button type="button" className="mt-2 text-[11px] font-bold text-purple-600" onClick={() => onOpen(row)}>
                {action}
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BoxDrawer({
  box,
  step,
  onClose,
  onChanged,
  onPreview,
}: {
  box: BoxRow | null;
  step: BoxStep;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onPreview: (sticker: FactorySticker) => void;
}) {
  const [weight, setWeight] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [racks, setRacks] = useState<ProductionRack[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!box) return;
    setWeight(box.scaleWeight ? String(box.scaleWeight) : '');
    setRackCode(box.rackCode || '');
    setError('');
    if (step === 'rack') {
      listProductionRacks({ page: 1, limit: 200, status: 'active' })
        .then((page) => {
          setRacks((page.results || []).filter((rack) => rack.stockType === 'box'));
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load racks'));
    }
  }, [box, step]);

  if (!box) return null;

  const sticker = () =>
    boxSticker({
      barcode: box.barcode,
      bundleCount: box.bundleCount ?? box.packingBundleIds?.length ?? 0,
      pieceQty: box.pieceQty,
      scaleWeight: box.scaleWeight,
      orderNumber: box.orderNumber,
    });

  const titles: Record<BoxStep, string> = {
    weigh: 'Weigh box',
    ready: 'Ready for dispatch',
    rack: 'Box rack',
  };

  return (
    <FactoryDrawer title={titles[step]} subtitle={box.barcode} open onClose={onClose}>
      <DrawerSection title={step === 'weigh' ? 'Scale' : step === 'ready' ? 'Seal label' : 'Put away'}>
        <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-700">
          <p>
            {box.bundleCount ?? box.packingBundleIds?.length ?? 0} packing bundles · {box.pieceQty} pcs
          </p>
          {box.packingBundleIds?.length ? (
            <p className="mt-1 font-mono text-[10px] text-gray-500">{box.packingBundleIds.join(', ')}</p>
          ) : null}
        </div>

        {step === 'weigh' ? (
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              setError('');
              try {
                await factoryRequest('/warehouse/boxes/weigh', {
                  method: 'POST',
                  body: JSON.stringify({ boxBarcode: box.barcode, scaleWeight: Number(weight) }),
                });
                onClose();
                await onChanged();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Weigh failed');
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="bxWeight">
              Scale weight (kg)
            </label>
            <input id="bxWeight" aria-label="Scale weight" className={fieldClass} inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} required />
            {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
            <button type="submit" className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving}>
              Save weight
            </button>
          </form>
        ) : null}

        {step === 'ready' ? (
          <div className="grid gap-3">
            <p className="text-[12px] text-gray-600">Print the seal label, then mark the box ready. It moves to the Box rack tab.</p>
            <button
              type="button"
              className="w-fit rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-800"
              onClick={() => onPreview(sticker())}
            >
              Preview seal label
            </button>
            <button
              type="button"
              className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError('');
                try {
                  await factoryRequest('/warehouse/boxes/ready', {
                    method: 'POST',
                    body: JSON.stringify({ boxBarcode: box.barcode }),
                  });
                  onPreview(sticker());
                  onClose();
                  await onChanged();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not mark ready');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Mark ready for dispatch
            </button>
            {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
          </div>
        ) : null}

        {step === 'rack' ? (
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              setError('');
              try {
                await factoryRequest('/warehouse/boxes/store', {
                  method: 'POST',
                  body: JSON.stringify({ boxBarcode: box.barcode, rackCode }),
                });
                onClose();
                await onChanged();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Rack failed');
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="bxRack">
              Box rack
            </label>
            <select
              id="bxRack"
              aria-label="Box rack list"
              className={fieldClass}
              value={rackCode}
              onChange={(event) => setRackCode(event.target.value)}
              required
            >
              <option value="">Select production rack</option>
              {racks.map((rack) => (
                <option key={rack.id} value={rack.code}>
                  {rack.name} · {rack.code} ({rack.stockType})
                </option>
              ))}
            </select>
            {!racks.length ? (
              <p className="text-[12px] text-red-600" role="alert">
                No box racks in catalog. Add one with stock type <span className="font-mono">box</span> (e.g. WH-BOX-01) under{' '}
                <Link href="/catalog/production-racks/add" className="font-bold text-purple-600">
                  Production racks
                </Link>
                , or run <span className="font-mono">npm run racks:migrate</span> in the backend to seed WH-BOX-01 / WH-BOX-02.
              </p>
            ) : null}
            <input
              aria-label="Box rack scan"
              className={fieldClass}
              placeholder="Or type / scan rack code"
              value={rackCode}
              onChange={(event) => setRackCode(event.target.value)}
              required
            />
            {error ? <p className="text-[12px] text-red-600" role="alert">{error}</p> : null}
            <button type="submit" className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving || !rackCode}>
              Put on rack
            </button>
          </form>
        ) : null}
      </DrawerSection>
    </FactoryDrawer>
  );
}