'use client';

import React, { useState } from 'react';
import { factoryRequest } from '@/shared/services/factoryApi';

interface TrackedRoll {
  barcode: string;
  rollCode?: string;
  fabricName?: string;
  colourName?: string;
  receivedLotNumber?: string;
  grossWeight?: number;
  netWeight?: number;
  qtyMeters?: number;
  currentGrossWeight?: number | null;
  currentNetWeight?: number | null;
  currentQtyMeters?: number | null;
  scaleWeight?: number;
  qcStatus?: string;
  status?: string;
  condition?: string;
  poNumber?: string;
  supplierName?: string;
  grnNumber?: string;
  receivedDate?: string | null;
  createdAt?: string | null;
  qcBy?: string;
  qcAt?: string | null;
  qcRemarks?: string;
}

interface TimelineEvent {
  id: string;
  at?: string | null;
  title: string;
  details: Record<string, string | number>;
}

interface TrackResult {
  roll: TrackedRoll;
  rackCode: string;
  location: string;
  stored: boolean;
  timeline: TimelineEvent[];
}

/**
 * Scans a roll barcode and shows its purchase, fabric, and history.
 */
export function RollTracker() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Loads the roll and its timeline for the scanned barcode or roll code.
   */
  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = code.trim();
    if (!value) return;
    setLoading(true);
    setError('');
    try {
      const data = await factoryRequest<TrackResult>(`/store/rolls/track/${encodeURIComponent(value)}`);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Roll not found');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clears the scan and the open roll.
   */
  const clear = () => {
    setCode('');
    setResult(null);
    setError('');
  };

  const roll = result?.roll;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-600">Scan or enter a roll barcode to view the PO, lot, fabric, supplier, weights, QC, and history.</p>
      <form className="space-y-1" onSubmit={search}>
        <div className="flex items-center justify-between">
          <label htmlFor="track-roll" className="text-xs font-medium text-gray-700">Roll barcode</label>
          {result || code ? (
            <button type="button" className="text-xs font-medium text-gray-500 hover:text-gray-800" onClick={clear}>Clear</button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <span className="relative min-w-0 flex-1">
            <i className="ri-barcode-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              id="track-roll"
              value={code}
              placeholder="Scan or enter roll barcode"
              aria-label="Roll barcode"
              className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(event) => setCode(event.target.value)}
            />
          </span>
          <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-primary px-4 text-xs font-bold text-white disabled:opacity-50" disabled={loading}>
            <i className="ri-check-line" aria-hidden />
            {loading ? 'Checking…' : 'Confirm'}
          </button>
        </div>
      </form>
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      {roll && result ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RollCard roll={roll} location={result.location} stored={result.stored} />
          <section className="rounded-lg border border-gray-200 bg-white p-4" aria-label="Roll timeline">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
              <i className="ri-time-line text-primary" aria-hidden />
              Timeline
              <span className="text-xs font-normal text-gray-500">({result.timeline.length} events)</span>
            </h3>
            <Timeline events={result.timeline} />
          </section>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Identity, weights, and purchase facts for the scanned roll.
 */
function RollCard({ roll, location, stored }: { roll: TrackedRoll; location: string; stored: boolean }) {
  const qc = roll.qcStatus
    ? `${roll.qcStatus}${roll.qcBy ? ` by ${roll.qcBy}` : ''}`
    : '—';
  return (
    <article className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-gray-800">
        <i className="ri-file-list-3-line shrink-0 text-primary" aria-hidden />
        <span className="truncate" title={roll.rollCode || roll.barcode}>Roll {roll.rollCode || roll.barcode}</span>
      </h3>
      <div className="grid gap-3" role="group" aria-label="Roll weights">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Received</p>
          <div className="grid grid-cols-3 gap-2">
            <Weight label="Gross (kg)" value={formatKg(roll.grossWeight)} />
            <Weight label="Net (kg)" value={formatKg(roll.netWeight)} highlight />
            <Weight label="Meters" value={formatMeters(roll.qtyMeters)} />
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Current</p>
          <div className="grid grid-cols-3 gap-2">
            <Weight label="Gross (kg)" value={formatKg(roll.currentGrossWeight)} />
            <Weight label="Net (kg)" value={formatKg(roll.currentNetWeight)} highlight />
            <Weight label="Meters" value={formatMeters(roll.currentQtyMeters)} />
          </div>
        </div>
      </div>
      <dl>
        <Fact label="Barcode" value={roll.barcode} />
        <Fact label="PO" value={roll.poNumber} />
        <Fact label="Supplier" value={roll.supplierName} />
        <Fact label="Fabric" value={roll.fabricName} />
        <Fact label="Colour" value={roll.colourName} />
        <Fact label="Lot" value={roll.receivedLotNumber} />
        <Fact label="GRN" value={roll.grnNumber} />
        <Fact label="Scale (kg)" value={formatKg(roll.scaleWeight)} />
        <Fact label="Location" value={stored ? location : location || '—'} />
        <Fact label="Stored" value={stored ? 'Yes' : 'No'} />
        <Fact label="QC" value={qc} />
        {roll.qcRemarks ? <Fact label="QC remarks" value={roll.qcRemarks} /> : null}
        <Fact label="Received" value={formatWhen(roll.receivedDate)} />
        <Fact label="Condition" value={roll.condition} />
        <Fact label="Status" value={roll.status} />
      </dl>
    </article>
  );
}

/**
 * Newest event first.
 */
function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <p className="py-4 text-sm text-gray-500">No history yet.</p>;
  return (
    <ol className="relative ms-3 space-y-4 border-s border-gray-200" aria-label="History timeline">
      {events.map((event) => (
        <li key={event.id} className="ms-4">
          <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-white" aria-hidden />
          <time className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{formatWhen(event.at)}</time>
          <h4 className="mt-0.5 text-sm font-semibold text-gray-900">{event.title}</h4>
          <dl className="mt-1 grid gap-0.5 text-xs text-gray-600">
            {Object.entries(event.details).map(([label, value]) => (
              <div key={label} className="flex flex-wrap gap-2">
                <dt className="shrink-0 font-medium text-gray-500">{label}:</dt>
                <dd className="break-all text-gray-800">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ol>
  );
}

/**
 * One labelled weight.
 */
function Weight({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? 'bg-primary/10' : 'bg-gray-50'}`}>
      <div className="text-[10px] uppercase text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

/**
 * Label and value row.
 */
function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-50 py-1.5 last:border-0">
      <dt className="shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="break-all text-right text-xs font-medium text-gray-900">{value || '—'}</dd>
    </div>
  );
}

/**
 * Kilograms, or an em dash when the weight was never recorded.
 */
function formatKg(value?: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

/**
 * Meters, or an em dash when the quantity was never recorded.
 */
function formatMeters(value?: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

/**
 * Local date and time for a timeline stamp.
 */
function formatWhen(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', { hour12: false });
}
