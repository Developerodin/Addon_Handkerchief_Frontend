'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CompletedQueueTable, CompletedRow } from '@/app/production/floor/shared/CompletedQueueTable';
import { QueueTab, QueueTabs } from '@/app/production/floor/shared/QueueTabs';
import { factoryRequest } from '@/shared/services/factoryApi';
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
  rackCode: string;
  finalQcInspected?: boolean;
  inspectionGoodQty?: number;
}

interface Board {
  results: UpcomingBundle[];
  awaitingPass?: UpcomingBundle[];
  received?: UpcomingBundle[];
  completed?: CompletedRow[];
  counts?: {
    waiting?: number;
    received?: number;
    completed?: number;
    doneToday?: number;
    onRack?: number;
  };
}

type Step = 'pick' | 'inspect' | 'pass' | 'done';

function BundleTable({
  rows,
  emptyText,
  onPick,
}: {
  rows: UpcomingBundle[];
  emptyText: string;
  onPick?: (row: UpcomingBundle) => void;
}) {
  return (
    <table className="w-full border-collapse border border-gray-200">
      <thead>
        <tr className="bg-gray-50/30">
          {['Bundle', 'Order', 'Qty', 'Rack'].map((label) => (
            <th key={label} className="border border-gray-200 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#495057]">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50/50">
              <td className="border border-gray-200 px-2 py-2 text-[12px]">
                {onPick ? (
                  <button type="button" className="font-mono font-semibold text-purple-600 hover:text-purple-700" onClick={() => onPick(row)}>
                    {row.barcode}
                  </button>
                ) : (
                  <span className="font-mono text-gray-900">{row.barcode}</span>
                )}
              </td>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">{row.orderNumber || row.orderId.slice(-6)}</td>
              <td className="border border-gray-200 px-2 py-2 text-[12px]">{row.arrivalQty ?? row.qty}</td>
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

export default function FinalQcPage() {
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
  const [loading, setLoading] = useState(false);
  const [doneSummary, setDoneSummary] = useState<{ passGoodQty: number; goodAddedQty: number } | null>(null);

  const loadUpcoming = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setBoardLoading(true);
    try {
      const data = await factoryRequest<Board>('/quality/final-qc/upcoming');
      setBoard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bundles');
    } finally {
      if (!opts?.silent) setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUpcoming().catch(() => undefined);
  }, [loadUpcoming]);

  const upcomingCount = board.counts?.waiting ?? board.results?.length ?? 0;
  const receivedCount = board.counts?.received ?? board.awaitingPass?.length ?? 0;
  const arrivalQty = selected?.arrivalQty ?? selected?.qty ?? 0;
  const defectSum = gradeDefectSum(grades);
  const inspectOk = arrivalQty > 0 && defectSum <= arrivalQty;
  const goodAfterInspection = Math.max(0, arrivalQty - defectSum);
  const baseGoodAfterInspect = inspectionGood > 0 ? inspectionGood : goodAfterInspection;
  const addedNum = Math.max(0, Number(goodAdded) || 0);
  const suggestedPass = baseGoodAfterInspect + addedNum;
  const displayPassQty = passQtyTouched ? passQty : passQty !== '' ? passQty : String(suggestedPass);
  const passOk = passStepOk(baseGoodAfterInspect, goodAdded, displayPassQty);

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
    const inspectedGood = row.inspectionGoodQty ?? Math.max(0, (row.arrivalQty ?? row.qty) - defectSum);
    setInspectionGood(inspectedGood);
    setGoodAdded('0');
    setPassQty(String(inspectedGood));
    setPassQtyTouched(false);
    setStep(startStep === 'pick' ? (row.finalQcInspected ? 'pass' : 'inspect') : startStep);
  };

  const pickFromScan = () => {
    const code = scan.trim();
    if (!code) return;
    const hit = allQueueRows.find((row) => row.barcode.toLowerCase() === code.toLowerCase());
    if (!hit) {
      setError('This bundle is not in the final QC queue');
      return;
    }
    applyBundle(hit, hit.finalQcInspected ? 'pass' : 'inspect');
    setScan('');
  };

  const saveInspection = async (finishLater: boolean) => {
    if (!selected || !inspectOk) return;
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { bundleId: selected.id };
      for (const g of FINAL_QC_GRADES) body[g] = Number(grades[g] || 0);
      const saved = await factoryRequest<{ inspectionGoodQty: number; arrivalQty: number }>('/quality/final-qc/inspect', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setInspectionGood(saved.inspectionGoodQty);
      await loadUpcoming({ silent: true });
      if (finishLater) {
        setStep('pick');
        setSelected(null);
      } else {
        setPassQty(String(saved.inspectionGoodQty + addedNum));
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
      const passNum = Number(displayPassQty);
      await factoryRequest('/quality/final-qc/pass', {
        method: 'POST',
        body: JSON.stringify({
          bundleId: selected.id,
          goodAddedQty: addedNum,
          passGoodQty: passNum,
        }),
      });
      setDoneSummary({ passGoodQty: passNum, goodAddedQty: addedNum });
      await loadUpcoming({ silent: true });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pass bundle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireCrudPermission path="Quality / Final QC" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Final QC" />
        <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-5 w-[3px] rounded bg-purple-600" aria-hidden />
              <h1 className="text-sm font-bold text-gray-800">Final QC</h1>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">{upcomingCount} waiting</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UiButton
                type="button"
                variant="secondary"
                icon="ri-refresh-line"
                loading={boardLoading}
                onClick={() => loadUpcoming({ silent: board.results.length > 0 }).catch(() => undefined)}
              >
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
            title="Final QC defect log"
            apiKind="final-qc"
          />

          <div
            className={
              queueTab === 'completed'
                ? 'grid gap-4 p-4'
                : 'grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]'
            }
          >
            <section aria-label="Bundle queue">
              <QueueTabs
                upcomingCount={upcomingCount}
                receivedCount={receivedCount}
                completedCount={board.completed?.length || board.counts?.completed || 0}
                onTabChange={setQueueTab}
                upcoming={(
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-600">Inspect now (thread-cut on rack)</p>
                    <BundleTable
                      rows={board.results || []}
                      emptyText="No thread-cut bundle is waiting on a rack."
                      onPick={(row) => applyBundle(row, 'inspect')}
                    />
                  </div>
                )}
                received={(
                  <div>
                    <p className="mb-2 text-[11px] text-gray-600">
                      Inspected bundles awaiting <strong>top-up and pass</strong> to ironing.
                    </p>
                    <BundleTable
                      rows={board.awaitingPass || []}
                      emptyText="Nothing in received. After inspect, bundles appear here for pass."
                      onPick={(row) => applyBundle(row, 'pass')}
                    />
                  </div>
                )}
                completed={
                  <CompletedQueueTable
                    rows={board.completed || []}
                    codeLabel="Bundle"
                    qtyIsTransferable
                    showGood
                    showArrival
                    showAdded
                    showDefectGrades
                    qtyColumnLabel="To ironing"
                    emptyText="No final QC passes in the last two weeks."
                  />
                }
              />
            </section>

            {queueTab === 'completed' ? null : (
              <section aria-label="Final QC steps" className="rounded-md border border-gray-200 bg-[#F9FAFB] p-4">
                <ol className="mb-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                  <li className={step === 'pick' ? 'text-purple-700' : 'text-gray-400'}>1. Pick</li>
                  <li className={step === 'inspect' ? 'text-purple-700' : 'text-gray-400'}>2. Inspect</li>
                  <li className={step === 'pass' ? 'text-purple-700' : 'text-gray-400'}>3. Pass</li>
                  <li className={step === 'done' ? 'text-purple-700' : 'text-gray-400'}>4. Done</li>
                </ol>

                {error ? <p className="mb-2 text-[12px] text-red-600">{error}</p> : null}

                {step === 'pick' ? (
                  <div className="grid gap-3">
                    <p className="text-[12px] text-gray-600">Scan or pick a bundle from Upcoming or Received.</p>
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        pickFromScan();
                      }}
                    >
                      <label className="min-w-[10rem] flex-1">
                        <span className={labelClass}>Bundle barcode</span>
                        <input className={fieldClass} value={scan} onChange={(e) => setScan(e.target.value)} placeholder="Scan BD-…" autoComplete="off" />
                      </label>
                      <UiButton type="submit" variant="primary">
                        Next
                      </UiButton>
                    </form>
                  </div>
                ) : null}

                {step === 'inspect' && selected ? (
                  <div className="grid gap-3">
                    <div className="rounded border border-white bg-white p-3 text-[12px] shadow-sm">
                      <p className="font-bold text-gray-900">{selected.barcode}</p>
                      <p className="text-gray-600">
                        {selected.orderNumber} · arrival <strong>{arrivalQty}</strong>
                        {selected.rackCode ? ` · rack ${selected.rackCode}` : ''}
                      </p>
                    </div>
                    <GradeDefectFields grades={grades} onChange={setGrades} arrivalQty={arrivalQty} />
                    <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-3">
                      <UiButton type="button" variant="secondary" onClick={() => setStep('pick')}>
                        Back
                      </UiButton>
                      <div className="flex flex-wrap gap-2">
                        <UiButton type="button" variant="secondary" loading={loading} disabled={!inspectOk} onClick={() => saveInspection(true).catch(() => undefined)}>
                          Save &amp; finish later
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
                    <div className="rounded border border-white bg-white p-3 text-[12px] shadow-sm">
                      <p className="font-bold text-gray-900">{selected.barcode}</p>
                      <p className="text-gray-600">
                        Good after inspect: <strong>{baseGoodAfterInspect}</strong>
                      </p>
                    </div>
                    <InspectPassFields
                      baseGoodAfterInspect={baseGoodAfterInspect}
                      goodAdded={goodAdded}
                      passQty={passQty}
                      passQtyTouched={passQtyTouched}
                      displayPassQty={displayPassQty}
                      nextFloorHint="Ironing"
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
                    <div className="flex justify-between gap-2 border-t border-gray-200 pt-3">
                      <UiButton type="button" variant="secondary" onClick={() => setStep(selected.finalQcInspected ? 'pick' : 'inspect')}>
                        Back
                      </UiButton>
                      <UiButton type="button" variant="primary" loading={loading} disabled={!passOk} onClick={() => savePass().catch(() => undefined)}>
                        Pass to ironing
                      </UiButton>
                    </div>
                  </div>
                ) : null}

                {step === 'done' ? (
                  <div className="grid gap-3">
                    <p className="text-[12px] font-semibold text-green-800">Final QC saved. Bundle ready for ironing.</p>
                    {doneSummary ? (
                      <p className="text-[11px] text-gray-700">
                        Passed <strong>{doneSummary.passGoodQty}</strong> pcs (added {doneSummary.goodAddedQty}).
                      </p>
                    ) : null}
                    <Link href="/production/floor/iron" className="text-[11px] font-semibold text-purple-700 underline">
                      Go to Ironing →
                    </Link>
                    <UiButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setStep('pick');
                        setSelected(null);
                        setDoneSummary(null);
                      }}
                    >
                      Check another bundle
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