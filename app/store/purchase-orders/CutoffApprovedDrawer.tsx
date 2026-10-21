'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { factoryRequest, LotRow, PageResult, PurchaseOrderLine, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { cutoffChoices, cutoffKey } from './cutoffApproval';

interface CutoffApprovedDrawerProps {
  order: PurchaseOrderRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

/**
 * Right drawer that approves or rejects each fabric line's cutoff.
 * Creates the lot on save when the order does not have one yet.
 */
export function CutoffApprovedDrawer({ order, onClose, onSaved }: CutoffApprovedDrawerProps) {
  const [lotId, setLotId] = useState('');
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order) return undefined;
    let cancelled = false;
    setError('');
    setLotId('');
    setChoices(cutoffChoices(order.lines || []));
    setLoading(true);
    factoryRequest<PageResult<LotRow>>(`/store/lots?poId=${order.id}&limit=20`)
      .then((data) => {
        if (cancelled) return;
        const lot = data.results?.[0];
        setLotId(lot?.id || '');
        setChoices(cutoffChoices(order.lines || [], lot?.cutoffs));
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load cutoffs';
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order]);

  useEffect(() => {
    if (!order) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [order, saving, onClose]);

  if (!order) return null;

  const lines = order.lines || [];

  /**
   * Persists one approve/reject decision per line. Does not approve lines the user left rejected.
   */
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lines.length) {
      setError('This order has no fabric lines');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const id = await ensureLot(order, lotId);
      const decisions = lines.map((line) => ({
        fabricId: cutoffKey(line),
        approved: Boolean(choices[cutoffKey(line)]),
      }));
      await factoryRequest(`/store/lots/${id}/cutoffs`, {
        method: 'POST',
        body: JSON.stringify({ decisions }),
      });
      toast.success(`Cutoffs saved for ${order.number}`);
      await onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save cutoffs';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-gray-900/40"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <aside role="dialog" aria-modal="true" aria-labelledby="cutoff-title" className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between bg-primary px-4 py-3 text-white">
          <div>
            <h2 id="cutoff-title" className="text-sm font-bold">Cutoff Approve</h2>
            <p className="text-xs text-white/80">{order.number}</p>
          </div>
          <button type="button" aria-label="Close" className="rounded p-1 text-white hover:bg-white/10" disabled={saving} onClick={onClose}>
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </header>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <p className="text-xs text-gray-500">
              {loading
                ? 'Loading cutoffs…'
                : 'Approve or reject each fabric line. Only an approved line can be packed or received.'}
            </p>
            {error ? <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">{error}</p> : null}
            <ul className="space-y-2" aria-label="Fabric cutoffs">
              {lines.map((line) => (
                <CutoffLine
                  key={line.lineId}
                  line={line}
                  approved={Boolean(choices[cutoffKey(line)])}
                  disabled={saving || loading}
                  onChange={(approved) => setChoices((current) => ({ ...current, [cutoffKey(line)]: approved }))}
                />
              ))}
            </ul>
            {lines.length === 0 ? <p className="text-sm text-gray-500">This order has no fabric lines.</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
            <button type="button" className="rounded border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" disabled={saving} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60" disabled={saving || loading || lines.length === 0}>
              {saving ? <i className="ri-loader-4-line animate-spin" aria-hidden /> : <i className="ri-check-line" aria-hidden />}
              Save cutoffs
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

/**
 * Returns the existing lot, or creates one with every line present and unapproved.
 */
async function ensureLot(order: PurchaseOrderRow, lotId: string): Promise<string> {
  if (lotId) return lotId;
  const existing = await factoryRequest<PageResult<LotRow>>(`/store/lots?poId=${order.id}&limit=20`);
  if (existing.results?.[0]?.id) return existing.results[0].id;
  const created = await factoryRequest<LotRow>('/store/lots', {
    method: 'POST',
    body: JSON.stringify({
      poId: order.id,
      cutoffs: (order.lines || []).map((line) => ({ fabricId: cutoffKey(line) })),
    }),
  });
  return created.id;
}

function CutoffLine({
  line,
  approved,
  disabled,
  onChange,
}: {
  line: PurchaseOrderLine;
  approved: boolean;
  disabled: boolean;
  onChange: (approved: boolean) => void;
}) {
  const name = cutoffKey(line);
  const title = line.fabricName || line.lineId;
  return (
    <li className="rounded border border-gray-200 p-3">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-0.5 text-xs text-gray-600">
        {[line.fabricTypeName, line.colourName].filter(Boolean).join(' · ') || '—'}
        {' · '}
        {Number(line.quantity || 0).toLocaleString('en-IN')} {line.unitName || ''}
      </p>
      <fieldset className="mt-2 flex gap-3" disabled={disabled}>
        <legend className="sr-only">Cutoff for {title}</legend>
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800">
          <input
            type="radio"
            name={`cutoff-${name}`}
            checked={approved}
            onChange={() => onChange(true)}
            aria-label={`Approve cutoff for ${title}`}
          />
          Approve
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800">
          <input
            type="radio"
            name={`cutoff-${name}`}
            checked={!approved}
            onChange={() => onChange(false)}
            aria-label={`Reject cutoff for ${title}`}
          />
          Reject
        </label>
      </fieldset>
    </li>
  );
}
