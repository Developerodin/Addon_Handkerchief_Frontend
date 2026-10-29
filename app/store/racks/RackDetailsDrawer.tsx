'use client';

import React, { useEffect, useState } from 'react';
import { factoryRequest, RollRow } from '@/shared/services/factoryApi';

export interface StorageRackCard {
  code: string;
  name: string;
  barcode: string;
  location?: string;
  floor: string;
  zone: string;
  status: string;
  count: number;
  fabrics?: string[];
}

export interface RackMove {
  id: string;
  barcode: string;
  kind: string;
  fromLocation: string;
  toLocation: string;
  at?: string;
}

export interface RackDetailsDrawerProps {
  rack: StorageRackCard;
  rolls: RollRow[];
  history: RackMove[];
  loading: boolean;
  error: string;
  canDelete: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Kilograms with the unit, or a dash when the value is missing.
 */
function formatKg(value?: number | null): string {
  const weight = Number(value);
  if (!Number.isFinite(weight)) return '-';
  return `${weight} kg`;
}

/**
 * Date as dd/mm/yyyy.
 */
function formatWhen(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
}

/**
 * Short QC label for the rolls table.
 */
function qcLabel(status?: string): string {
  if (status === 'passed') return 'Passed';
  if (status === 'held') return 'Held';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

/**
 * Right drawer for one storage rack: slot facts, rolls on it, and move history.
 */
export function RackDetailsDrawer({ rack, rolls, history, loading, error, canDelete, onClose, onDeleted }: RackDetailsDrawerProps) {
  const [tab, setTab] = useState<'details' | 'history'>('details');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setConfirming(false);
    setDeleting(false);
    setDeleteError('');
  }, [rack.code]);

  /**
   * Blocks a rack that still holds rolls. An empty rack asks for confirm first.
   */
  const requestDelete = () => {
    if (rolls.length > 0) {
      setDeleteError('This rack contains fabric rolls');
      setConfirming(false);
      return;
    }
    setDeleteError('');
    setConfirming(true);
  };

  /**
   * Removes the open rack. The server rejects the call when a roll is still on it.
   */
  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await factoryRequest(`/store/racks/${encodeURIComponent(rack.code)}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this rack');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close rack details" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="rack-details-title"
        className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="rack-details-title" className="flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="h-4 w-[3px] rounded bg-primary" aria-hidden />
            Rack details — {rack.code}
          </h2>
          <button type="button" className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="Close" onClick={onClose}>
            <i className="ri-close-line text-lg leading-none" aria-hidden />
          </button>
        </header>
        <div className="flex gap-5 border-b border-gray-100 px-5" role="tablist" aria-label="Rack details">
          <TabButton id="details" active={tab === 'details'} icon="ri-information-line" label="Details" onSelect={() => setTab('details')} />
          <TabButton id="history" active={tab === 'history'} icon="ri-history-line" label="History" onSelect={() => setTab('history')} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? <p className="mb-3 text-sm text-red-600" role="alert">{error}</p> : null}
          {loading ? <p className="py-8 text-center text-xs text-gray-500">Loading rack…</p> : null}
          {!loading && tab === 'details' ? <DetailsPane rack={rack} rolls={rolls} /> : null}
          {!loading && tab === 'history' ? <HistoryPane history={history} /> : null}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
          <DeleteRackControl
            code={rack.code}
            canDelete={canDelete}
            loading={loading}
            confirming={confirming}
            deleting={deleting}
            error={deleteError}
            onRequest={requestDelete}
            onConfirm={confirmDelete}
            onCancel={() => setConfirming(false)}
          />
          <button type="button" className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-white" onClick={onClose}>Close</button>
        </footer>
      </aside>
    </div>
  );
}

/**
 * Delete for the open rack. Occupied racks show an error and are not removed.
 */
function DeleteRackControl({
  code,
  canDelete,
  loading,
  confirming,
  deleting,
  error,
  onRequest,
  onConfirm,
  onCancel,
}: {
  code: string;
  canDelete: boolean;
  loading: boolean;
  confirming: boolean;
  deleting: boolean;
  error: string;
  onRequest: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!canDelete) return null;
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <span className="text-xs text-gray-700">Delete {code}?</span>
          <button
            type="button"
            className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button type="button" className="rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700" disabled={deleting} onClick={onCancel}>
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          className="rounded border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
          disabled={loading || deleting}
          onClick={onRequest}
        >
          Delete rack
        </button>
      )}
      {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : null}
    </div>
  );
}

/**
 * Details or History tab control.
 */
function TabButton({
  id,
  active,
  icon,
  label,
  onSelect,
}: {
  id: string;
  active: boolean;
  icon: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`rack-tab-${id}`}
      aria-selected={active}
      className={`inline-flex items-center gap-1 border-b-2 py-2 text-[11px] font-bold uppercase ${active ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
      onClick={onSelect}
    >
      <i className={icon} aria-hidden />
      {label}
    </button>
  );
}

/**
 * Slot facts and the rolls currently stored on this rack.
 */
function DetailsPane({ rack, rolls }: { rack: StorageRackCard; rolls: RollRow[] }) {
  const active = rack.status === 'active';
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          <i className="ri-information-line" aria-hidden /> Slot information
        </h3>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Label" value={rack.code} />
          <Fact label="Barcode" value={rack.barcode || rack.code} />
          <Fact label="Location" value={rack.location || '-'} />
          <Fact label="Zone" value={rack.zone || '-'} />
          <Fact label="Floor" value={rack.floor || '-'} />
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Status</dt>
            <dd className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {active ? 'Active' : rack.status || '-'}
            </dd>
          </div>
        </dl>
      </section>
      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          <i className="ri-archive-line" aria-hidden /> Rolls in rack ({rolls.length})
        </h3>
        {rolls.length === 0 ? <p className="text-xs text-gray-500">This rack is empty.</p> : <RollsTable rolls={rolls} />}
      </section>
    </div>
  );
}

/**
 * One slot-information cell.
 */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-xs font-medium text-gray-900">{value}</dd>
    </div>
  );
}

/**
 * Rolls stored on the open rack.
 */
function RollsTable({ rolls }: { rolls: RollRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {['Roll info', 'PO & fabric', 'Attributes', 'Gross weight', 'Net weight', 'QC status', 'Date'].map((label) => (
              <th key={label} scope="col" className="px-2 py-2">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rolls.map((roll) => (
            <tr key={roll.id} className="border-b border-gray-100 align-top">
              <td className="px-2 py-2.5">
                <p className="text-xs font-semibold text-gray-900">{roll.rollCode || '-'}</p>
                <p className="font-mono text-[10px] text-gray-400">{roll.barcode}</p>
              </td>
              <td className="px-2 py-2.5">
                <p className="text-xs font-semibold text-primary">{roll.poNumber || '-'}</p>
                <p className="text-[11px] text-gray-600">{roll.fabricName || '-'}</p>
              </td>
              <td className="px-2 py-2.5 text-[11px] text-gray-600">
                <p>Lot: {roll.receivedLotNumber || '-'}</p>
                <p>Colour: {roll.colourName || '-'}</p>
              </td>
              <td className="px-2 py-2.5 text-xs text-gray-800">{formatKg(roll.grossWeight)}</td>
              <td className="px-2 py-2.5 text-xs text-gray-800">{formatKg(roll.netWeight)}</td>
              <td className="px-2 py-2.5">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${roll.qcStatus === 'passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {qcLabel(roll.qcStatus)}
                </span>
                {roll.lastUser ? <p className="mt-1 text-[10px] text-gray-400">By: {roll.lastUser}</p> : null}
              </td>
              <td className="px-2 py-2.5 text-xs text-gray-700">{formatWhen(roll.lastAt || roll.receivedDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Movements that landed on this rack.
 */
function HistoryPane({ history }: { history: RackMove[] }) {
  if (!history.length) return <p className="text-xs text-gray-500">No moves recorded for this rack.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {history.map((move) => (
        <li key={move.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-xs">
          <span className="font-mono text-gray-800">{move.barcode}</span>
          <span className="text-gray-600">{move.kind} · {move.fromLocation || '—'} → {move.toLocation || '—'}</span>
          <span className="text-gray-400">{formatWhen(move.at)}</span>
        </li>
      ))}
    </ul>
  );
}
