'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CompletedQueueTable, CompletedRow } from '@/app/production/floor/shared/CompletedQueueTable';
import { QueueTab, QueueTabs } from '@/app/production/floor/shared/QueueTabs';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listProductionRacks, ProductionRack } from '@/shared/services/phase3CatalogService';
import { UiButton } from '@/shared/components/ui';
import { QcDefectLogDrawer } from '@/app/quality/shared/QcDefectLogDrawer';
import { GradeDefectFields, FINAL_QC_GRADES, gradeDefectSum } from '@/app/quality/shared/GradeDefectFields';
import { InspectPassFields, fieldClass, labelClass, passStepOk } from '@/app/quality/shared/InspectPassFields';

interface UpcomingBundle {
  id: string;
  barcode: string;
  orderId: string;
  orderNumber: string;
  qty: number;
  arrivalQty?: number;
  finalGood?: number;
  rackCode: string;
  finalCheckingInspected?: boolean;
  inspectionGoodQty?: number;
}

interface Board {
  results: UpcomingBundle[];
  awaitingPass?: UpcomingBundle[];
  completed?: CompletedRow[];
  counts?: { waiting?: number; received?: number; completed?: number };
}

type Step = 'pick' | 'inspect' | 'pass' | 'done';

function BundleTable({
  rows,
  emptyText,
  onPick,
  qtyLabel = 'Good',
}: {
  rows: UpcomingBundle[];
  emptyText: string;
  onPick?: (row: UpcomingBundle) => void;
  qtyLabel?: string;
}) {
  return (
    <table className="w-full border-collapse border border-gray-200">
      <thead>
        <tr className="bg-gray-50/30">
          {['Bundle', 'Order', qtyLabel, 'Rack'].map((label) => (
            <th key={label} className="border border-gray-200 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#495057]">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row) => (
            <tr key={row.id}>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">
                {onPick ? (
                  <button type="button" className="font-mono font-semibold text-purple-600" onClick={() => onPick(row)}>
                    {row.barcode}
                  </button>
                ) : (
                  <span className="font-mono">{row.barcode}</span>
                )}
              </td>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">{row.orderNumber}</td>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">{row.finalGood ?? row.arrivalQty ?? row.qty}</td>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">{row.rackCode || '—'}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="border border-gray-200 py-12 text-center text-[11px] text-gray-400">
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function FinalCheckingPage() {
  const [board, setBoard] = useState<Board>({ results: [] });
  const [boardLoading, setBoardLoading] = useState(false);
  const [queueTab, setQueueTab] = useState<QueueTab>('upcoming');
  const [showDefectLog, setShowDefectLog] = useState(false);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [step, setStep] = useState<Step>('pick');
  const [selected, setSelected] = useState<UpcomingBundle | null>(null);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [inspectionGood, setInspectionGood] = useState(0);
  const [goodAdded, setGoodAdded] = useState('0');
  const [passQty, setPassQty] = useState('');
  const [passQtyTouched, setPassQtyTouched] = useState(false);
  const [rackCode, setRackCode] = useState('');
  const [racks, setRacks] = useState<ProductionRack[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUpcoming = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setBoardLoading(true);
    try {
      const data = await factoryRequest<Board>('/quality/final-checking/upcoming');
      setBoard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bundles');
    } finally {
      if (!opts?.silent) setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUpcoming().catch(() => undefined);
    listProductionRacks({ page: 1, limit: 200, status: 'active' })
      .then((page) => {
        const packing = (page.results || []).filter((rack) => rack.stockType === 'packing');
        setRacks(packing.length ? packing : page.results || []);
      })
      .catch(() => undefined);
  }, [loadUpcoming]);

  const upcomingCount = board.counts?.waiting ?? board.results?.length ?? 0;
  const receivedCount = board.counts?.received ?? board.awaitingPass?.length ?? 0;
  const arrivalQty = selected?.arrivalQty ?? selected?.finalGood ?? selected?.qty ?? 0;
  const defectSum = gradeDefectSum(grades);
  const inspectOk = arrivalQty > 0 && defectSum <= arrivalQty;
  const goodAfterInspection = Math.max(0, arrivalQty - defectSum);
  const baseGoodAfterInspect = inspectionGood > 0 ? inspectionGood : goodAfterInspection;
  const addedNum = Math.max(0, Number(goodAdded) || 0);
  const suggestedPass = baseGoodAfterInspect + addedNum;
  const displayPassQty = passQtyTouched ? passQty : passQty !== '' ? passQty : String(suggestedPass);
  const passNum = Number(displayPassQty);
  const passOk =
    passStepOk(baseGoodAfterInspect, goodAdded, displayPassQty) &&
    (passNum === 0 || Boolean(rackCode.trim()));

  const allQueueRows = useMemo(
    () => [...(board.results || []), ...(board.awaitingPass || [])],
    [board.results, board.awaitingPass]
  );

  const resetGrades = () => {
    const blank: Record<string, string> = {};
    for (const g of FINAL_QC_GRADES) blank[g] = '0';
    setGrades(blank);
  };

  const applyBundle = (row: UpcomingBundle, startStep: Step) => {
    setSelected(row);
    setError('');
    resetGrades();
    setInspectionGood(row.inspectionGoodQty ?? 0);
    setGoodAdded('0');
    setPassQty(String(row.inspectionGoodQty ?? row.finalGood ?? row.qty));
    setPassQtyTouched(false);
    setRackCode('');
    setStep(startStep === 'pick' ? (row.finalCheckingInspected ? 'pass' : 'inspect') : startStep);
  };

  const pickFromScan = () => {
    const hit = allQueueRows.find((row) => row.barcode.toLowerCase() === scan.trim().toLowerCase());
    if (!hit) {
      setError('This bundle is not ready for final checking');
      return;
    }
    applyBundle(hit, hit.finalCheckingInspected ? 'pass' : 'inspect');
    setScan('');
  };

  const saveInspection = async (finishLater: boolean) => {
    if (!selected || !inspectOk) return;
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { bundleId: selected.id };
      for (const g of FINAL_QC_GRADES) body[g] = Number(grades[g] || 0);
      const saved = await factoryRequest<{ inspectionGoodQty: number }>('/quality/final-checking/inspect', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setInspectionGood(saved.inspectionGoodQty);
      await loadUpcoming({ silent: true });
      if (finishLater) {
        setStep('pick');
        setSelected(null);
      } else {
        setPassQty(String(saved.inspectionGoodQty));
        setPassQtyTouched(false);
        setStep('pass');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save inspection');
    } finally {
      setLoading(false);
    }
  };

  const savePass = async () => {
    if (!selected || !passOk) return;
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/quality/final-checking/pass', {
        method: 'POST',
        body: JSON.stringify({
          bundleId: selected.id,
          goodAddedQty: addedNum,
          passGoodQty: passNum,
          rackCode: rackCode.trim(),
        }),
      });
      await loadUpcoming({ silent: true });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pass to packing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireCrudPermission path="Quality / Final checking" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Final checking" />
        <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-5 w-[3px] rounded bg-purple-600" aria-hidden />
              <h1 className="text-sm font-bold text-gray-800">Final checking</h1>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">{upcomingCount}</span>
            </div>
            <div className="flex gap-2">
              <UiButton type="button" variant="secondary" icon="ri-refresh-line" loading={boardLoading} onClick={() => loadUpcoming({ silent: true }).catch(() => undefined)}>
                Refresh
              </UiButton>
              <UiButton type="button" variant="secondary" icon="ri-file-list-3-line" onClick={() => setShowDefectLog(true)}>
                Defect log
              </UiButton>
            </div>
          </header>

          <QcDefectLogDrawer
            open={showDefectLog}
            onClose={() => setShowDefectLog(false)}
            orderId={selected?.orderId}
            orderNumber={selected?.orderNumber}
            title="Final checking defect log"
            apiKind="final-checking"
          />

          <div
            className={
              queueTab === 'completed'
                ? 'grid gap-4 p-4'
                : 'grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]'
            }
          >
            <section>
              <QueueTabs
                upcomingCount={upcomingCount}
                receivedCount={receivedCount}
                completedCount={board.completed?.length || 0}
                onTabChange={setQueueTab}
                upcoming={
                  <BundleTable
                    rows={board.results || []}
                    emptyText="Nothing is waiting for final checking."
                    onPick={(row) => applyBundle(row, 'inspect')}
                  />
                }
                received={
                  <BundleTable
                    rows={board.awaitingPass || []}
                    emptyText="After inspect, bundles appear here for pass and packing rack."
                    onPick={(row) => applyBundle(row, 'pass')}
                  />
                }
                completed={
                  <CompletedQueueTable
                    rows={board.completed || []}
                    codeLabel="Bundle"
                    qtyIsTransferable
                    showGood
                    showArrival
                    showAdded
                    showDefectGrades
                    qtyColumnLabel="Packed"
                  />
                }
              />
            </section>

            {queueTab === 'completed' ? null : (
              <section className="rounded-md border border-gray-200 bg-[#F9FAFB] p-4">
                <ol className="mb-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                  <li className={step === 'pick' ? 'text-purple-700' : 'text-gray-400'}>1. Pick</li>
                  <li className={step === 'inspect' ? 'text-purple-700' : 'text-gray-400'}>2. Inspect</li>
                  <li className={step === 'pass' ? 'text-purple-700' : 'text-gray-400'}>3. Pass</li>
                  <li className={step === 'done' ? 'text-purple-700' : 'text-gray-400'}>4. Done</li>
                </ol>
                {error ? <p className="mb-2 text-[12px] text-red-600">{error}</p> : null}

                {step === 'pick' ? (
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      pickFromScan();
                    }}
                  >
                    <label className="flex-1">
                      <span className={labelClass}>Bundle barcode</span>
                      <input className={fieldClass} value={scan} onChange={(e) => setScan(e.target.value)} autoComplete="off" />
                    </label>
                    <UiButton type="submit" variant="primary">
                      Next
                    </UiButton>
                  </form>
                ) : null}

                {step === 'inspect' && selected ? (
                  <div className="grid gap-3">
                    <p className="text-[12px] font-bold text-gray-900">{selected.barcode} · good {arrivalQty}</p>
                    <GradeDefectFields grades={grades} onChange={setGrades} arrivalQty={arrivalQty} />
                    <div className="flex justify-between gap-2 border-t border-gray-200 pt-3">
                      <UiButton type="button" variant="secondary" onClick={() => setStep('pick')}>
                        Back
                      </UiButton>
                      <div className="flex gap-2">
                        <UiButton type="button" variant="secondary" loading={loading} disabled={!inspectOk} onClick={() => saveInspection(true).catch(() => undefined)}>
                          Save &amp; later
                        </UiButton>
                        <UiButton type="button" variant="primary" loading={loading} disabled={!inspectOk} onClick={() => saveInspection(false).catch(() => undefined)}>
                          Continue → pass
                        </UiButton>
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === 'pass' && selected ? (
                  <div className="grid gap-3">
                    <InspectPassFields
                      baseGoodAfterInspect={baseGoodAfterInspect}
                      goodAdded={goodAdded}
                      passQty={passQty}
                      passQtyTouched={passQtyTouched}
                      displayPassQty={displayPassQty}
                      nextFloorHint="Packing"
                      onGoodAddedChange={(value) => {
                        setGoodAdded(value);
                        const added = Math.max(0, Number(value) || 0);
                        setPassQty(String(baseGoodAfterInspect + added));
                        setPassQtyTouched(false);
                      }}
                      onPassQtyChange={(value) => {
                        setPassQty(value);
                        setPassQtyTouched(value !== '');
                      }}
                    />
                    <div>
                      <span className={labelClass}>Packing rack {passNum > 0 ? '(required)' : ''}</span>
                      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          className={fieldClass}
                          value={rackCode}
                          placeholder="Scan packing rack"
                          autoComplete="off"
                          aria-label="Scan packing rack"
                          onChange={(e) => setRackCode(e.target.value)}
                        />
                        <select
                          className={fieldClass}
                          value={rackCode}
                          aria-label="Select packing rack"
                          onChange={(e) => setRackCode(e.target.value)}
                        >
                          <option value="">Select packing rack</option>
                          {racks.map((rack) => (
                            <option key={rack.id} value={rack.code}>
                              {rack.name} · {rack.code}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {!racks.length ? (
                      <p className="text-[11px] text-gray-600">
                        Add packing racks under{' '}
                        <Link href="/catalog/production-racks" className="text-purple-700 underline">
                          Production racks
                        </Link>
                        .
                      </p>
                    ) : null}
                    <div className="flex justify-between gap-2 border-t border-gray-200 pt-3">
                      <UiButton type="button" variant="secondary" onClick={() => setStep('pick')}>
                        Back
                      </UiButton>
                      <UiButton type="button" variant="primary" loading={loading} disabled={!passOk} onClick={() => savePass().catch(() => undefined)}>
                        Pass to packing
                      </UiButton>
                    </div>
                  </div>
                ) : null}

                {step === 'done' ? (
                  <div className="grid gap-2">
                    <p className="text-[12px] font-semibold text-green-800">Passed to packing rack.</p>
                    <UiButton type="button" variant="secondary" onClick={() => { setStep('pick'); setSelected(null); }}>
                      Another bundle
                    </UiButton>
                  </div>
                ) : null}
              </section>
            )}
          </div>
        </div>
      </div>
    </RequireCrudPermission>
  );
}