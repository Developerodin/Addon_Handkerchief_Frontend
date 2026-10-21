'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { factoryRequest, LotRow, PageResult, PurchaseOrderLine, PurchaseOrderRow } from '@/shared/services/factoryApi';
import { approvedCutoffKeys, cutoffKey } from './cutoffApproval';
import { FileUploadService, UploadedFile } from '@/shared/services/fileUploadService';
import { formatInr } from './add/purchaseOrderFormModel';
import {
  emptyTransitEntry,
  entryFromPackingList,
  lineLabel,
  orderAmount,
  PackingListRow,
  transitEntryError,
  TransitPackEntry,
} from './markInTransitModel';

const cell = 'border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700';
const inputClass = 'w-full min-w-[4.5rem] border-0 bg-transparent px-1.5 py-1 text-xs text-gray-900 focus:bg-primary/5 focus:outline-none';

interface MarkInTransitDrawerProps {
  order: PurchaseOrderRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

/**
 * Right drawer that records a packlist and marks the purchase order in transit.
 */
export function MarkInTransitDrawer({ order, onClose, onSaved }: MarkInTransitDrawerProps) {
  const [entries, setEntries] = useState<TransitPackEntry[]>([emptyTransitEntry(order)]);
  const [approvedKeys, setApprovedKeys] = useState<Set<string>>(new Set());
  const [lotId, setLotId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!order) return undefined;
    let cancelled = false;
    setEntries([emptyTransitEntry(order)]);
    setApprovedKeys(new Set());
    setLotId('');
    setError('');
    setLoading(true);
    Promise.all([
      factoryRequest<PageResult<PackingListRow>>(`/store/packing-lists?poId=${order.id}&limit=50`),
      factoryRequest<PageResult<LotRow>>(`/store/lots?poId=${order.id}&limit=20`),
    ])
      .then(([data, lots]) => {
        if (cancelled) return;
        const lot = lots.results?.[0];
        const keys = approvedCutoffKeys(lot?.cutoffs);
        setApprovedKeys(keys);
        setLotId(lot?.id || '');
        const saved = (data.results || []).map(entryFromPackingList).map((entry) => ({
          ...entry,
          lineIds: entry.lineIds.filter((id) => {
            const line = (order.lines || []).find((row) => row.lineId === id);
            return Boolean(line && keys.has(cutoffKey(line)));
          }),
        }));
        setEntries(saved.length ? saved : [emptyTransitEntry(order)]);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load the packlist';
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

  const patch = (key: string, next: Partial<TransitPackEntry>) => {
    setEntries((rows) => rows.map((row) => (row.key === key ? { ...row, ...next } : row)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lotId) {
      const message = 'Approve a cutoff before marking this order in transit';
      setError(message);
      toast.error(message);
      return;
    }
    const anyApproved = (order.lines || []).some((line) => approvedKeys.has(cutoffKey(line)));
    if (!anyApproved) {
      const message = 'Cutoff is not approved';
      setError(message);
      toast.error(message);
      return;
    }
    const issue = entries
      .map((entry, index) => transitEntryError(entry, index, order.lines || [], approvedKeys))
      .find(Boolean);
    if (issue) {
      setError(issue);
      toast.error(issue);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const savedLotId = lotId;
      for (const entry of entries) {
        const selected = (order.lines || []).filter((line) => entry.lineIds.includes(line.lineId));
        const uploaded = await uploadEntryFiles(entry.files);
        const body = {
          lotId: savedLotId,
          packingListCode: entry.packingNumber.trim(),
          shipmentDate: entry.dispatchDate,
          expectedDelivery: entry.estimatedDelivery,
          fabricName: selected.map((line) => line.fabricName).filter(Boolean).join(', '),
          rolls: Number(entry.rolls),
          boxes: Number(entry.rolls),
          quantity: selected.reduce((sum, line) => sum + (line.quantity || 0), 0),
          weight: Number(entry.weight),
          courierName: entry.courierName.trim(),
          courierNumber: entry.courierNumber.trim(),
          vehicleNumber: entry.vehicleNumber.trim(),
          challanNumber: entry.challanNumber.trim(),
          notes: entry.notes.trim(),
          lineIds: entry.lineIds,
          files: [...entry.savedFiles, ...uploaded],
        };
        if (entry.id) {
          await factoryRequest(`/store/packing-lists/${entry.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        } else {
          await factoryRequest('/store/packing-lists', { method: 'POST', body: JSON.stringify(body) });
        }
      }
      toast.success(`${order.number} marked in transit`);
      await onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not mark the order in transit';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-gray-900/40" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="transit-title" className="flex h-full w-full max-w-[1100px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between bg-primary px-4 py-3 text-white">
          <div>
            <h2 id="transit-title" className="text-sm font-bold">Mark Order as In Transit</h2>
            <p className="text-xs text-white/80">{order.number}</p>
          </div>
          <button type="button" aria-label="Close" className="rounded p-1 text-white hover:bg-white/10" disabled={saving} onClick={onClose}>
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </header>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-800">Order Details</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Detail label="PO Number" value={order.number} />
                <Detail label="Supplier" value={order.supplierName} />
                <Detail label="Order Date" value={order.purchaseDate ? new Date(order.purchaseDate).toLocaleDateString('en-GB') : '—'} />
                <Detail label="Total Amount" value={formatInr(orderAmount(order.lines))} />
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-800">Order Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={cell}>Fabric name</th>
                      <th className={cell}>Type</th>
                      <th className={cell}>Color</th>
                      <th className={cell}>Qty</th>
                      <th className={cell}>Unit</th>
                      <th className={cell}>Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.lines || []).map((line) => (
                      <tr key={line.lineId}>
                        <td className="border border-gray-300 px-2 py-1.5">{line.fabricName || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1.5">{line.fabricTypeName || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1.5">{line.colourName || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right">{Number(line.quantity || 0).toLocaleString('en-IN')}</td>
                        <td className="border border-gray-300 px-2 py-1.5">{line.unitName || '—'}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right">{formatInr(line.rate || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <p className="text-xs text-gray-500">
              {loading
                ? 'Loading the saved packlist…'
                : 'Each packlist entry is one row. Select the fabric lines, then fill packing, courier, dates, rolls, weight, and notes.'}
            </p>
            {entries.map((entry, index) => (
              <PacklistEntry
                key={entry.key}
                index={index}
                entry={entry}
                lines={order.lines || []}
                approvedKeys={approvedKeys}
                canRemove={entries.length > 1}
                onChange={(next) => patch(entry.key, next)}
                onRemove={() => setEntries((rows) => rows.filter((row) => row.key !== entry.key))}
              />
            ))}
            {error ? <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">{error}</p> : null}
            <div className="flex justify-center">
              <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setEntries((rows) => [...rows, emptyTransitEntry(order)])}>
                + Add Another Entry
              </button>
            </div>
          </div>
          <footer className="flex justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
            <button type="button" className="rounded border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" disabled={saving} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60" disabled={saving || loading}>
              {saving ? <i className="ri-loader-4-line animate-spin" aria-hidden /> : <i className="ri-check-line" aria-hidden />}
              Update to In Transit
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

/**
 * Uploads packlist attachments. An empty list skips the request.
 */
async function uploadEntryFiles(files: File[]): Promise<UploadedFile[]> {
  const uploaded: UploadedFile[] = [];
  for (const file of files) {
    uploaded.push(await FileUploadService.uploadFile(file));
  }
  return uploaded;
}

/**
 * Readable line for the selected-items list under packlist notes.
 */
function selectedLineText(line: PurchaseOrderLine): string {
  const qty = Number(line.quantity || 0).toLocaleString('en-IN');
  const measure = [qty, line.unitName].filter(Boolean).join(' ');
  return [line.fabricName, line.fabricTypeName, line.colourName, measure].filter(Boolean).join(' · ') || line.lineId;
}

function PacklistEntry({
  index,
  entry,
  lines,
  approvedKeys,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  entry: TransitPackEntry;
  lines: PurchaseOrderLine[];
  approvedKeys: Set<string>;
  canRemove: boolean;
  onChange: (next: Partial<TransitPackEntry>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLTableCellElement>(null);
  const selected = lines.filter((line) => entry.lineIds.includes(line.lineId));

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <section className="overflow-hidden rounded border border-gray-300">
      <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Packlist entry {index + 1}</h3>
        {canRemove ? (
          <button type="button" className="text-[11px] font-semibold text-red-600" onClick={onRemove} aria-label={`Remove packlist entry ${index + 1}`}>
            Remove
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {['PO items', 'Packing #', 'Courier', 'Courier #', 'Vehicle #', 'Challan #', 'Dispatch', 'Est. delivery', 'Rolls', 'Wt (kg)'].map((label, column) => (
                <th key={label} className={cell}>{label}{column === 0 || column === 1 || column === 2 || column >= 6 ? ' *' : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td ref={boxRef} className="relative border border-gray-300 p-1 align-top">
                <button type="button" aria-expanded={open} aria-label="Select PO lines" className="w-40 px-1.5 py-1 text-left text-xs text-gray-700" onClick={() => setOpen((value) => !value)}>
                  {selected.length ? `${selected.length} selected` : 'Select PO lines...'}
                </button>
                {open ? (
                  <ul className="absolute left-0 z-20 mt-1 max-h-40 w-64 overflow-auto rounded border border-gray-200 bg-white shadow-lg" role="listbox" aria-label="PO lines" aria-multiselectable="true">
                    {lines.map((line) => {
                      const approved = approvedKeys.has(cutoffKey(line));
                      const checked = approved && entry.lineIds.includes(line.lineId);
                      return (
                        <li key={line.lineId}>
                          <label className={`flex items-start gap-2 px-2 py-1.5 text-xs ${approved ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed text-gray-400'}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!approved}
                              aria-label={approved ? lineLabel(line) : `${lineLabel(line)}, cutoff not approved`}
                              onChange={() => {
                                if (!approved) return;
                                const lineIds = checked ? entry.lineIds.filter((id) => id !== line.lineId) : [...entry.lineIds, line.lineId];
                                onChange({ lineIds });
                              }}
                            />
                            <span>
                              {lineLabel(line)}
                              {approved ? null : <span className="mt-0.5 block text-[10px] font-semibold text-amber-700">Cutoff not approved</span>}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </td>
              <td className="border border-gray-300 p-0"><input aria-label="Packing number" className={inputClass} value={entry.packingNumber} onChange={(event) => onChange({ packingNumber: event.target.value })} /></td>
              <td className="border border-gray-300 p-0"><input aria-label="Courier" className={inputClass} value={entry.courierName} onChange={(event) => onChange({ courierName: event.target.value })} /></td>
              <td className="border border-gray-300 p-0"><input aria-label="Courier number" className={inputClass} value={entry.courierNumber} onChange={(event) => onChange({ courierNumber: event.target.value })} /></td>
              <td className="border border-gray-300 p-0"><input aria-label="Vehicle number" className={inputClass} value={entry.vehicleNumber} onChange={(event) => onChange({ vehicleNumber: event.target.value })} /></td>
              <td className="border border-gray-300 p-0"><input aria-label="Challan number" className={inputClass} value={entry.challanNumber} onChange={(event) => onChange({ challanNumber: event.target.value })} /></td>
              <td className="border border-gray-300 p-0"><input aria-label="Dispatch date" type="date" className={inputClass} value={entry.dispatchDate} onChange={(event) => onChange({ dispatchDate: event.target.value })} /></td>
              <td className="border border-gray-300 p-0"><input aria-label="Estimated delivery" type="date" className={inputClass} value={entry.estimatedDelivery} onChange={(event) => onChange({ estimatedDelivery: event.target.value })} /></td>
              <td className="border border-gray-300 p-0"><input aria-label="Rolls" inputMode="numeric" className={inputClass} value={entry.rolls} onChange={(event) => onChange({ rolls: event.target.value.replace(/[^\d]/g, '') })} /></td>
              <td className="border border-gray-300 p-0"><input aria-label="Weight" inputMode="decimal" className={inputClass} value={entry.weight} onChange={(event) => onChange({ weight: event.target.value.replace(/[^\d.]/g, '') })} /></td>
            </tr>
            <tr>
              <td className="border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase text-gray-600">Notes</td>
              <td className="border border-gray-300 p-0" colSpan={9}>
                <textarea aria-label="Packlist notes" rows={2} placeholder="Optional remarks..." className={`${inputClass} resize-y`} value={entry.notes} onChange={(event) => onChange({ notes: event.target.value })} />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase text-gray-600">Selected</td>
              <td className="border border-gray-300 px-2 py-1.5" colSpan={9}>
                {selected.length ? (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-gray-800">
                    {selected.map((line) => (
                      <li key={line.lineId}>{selectedLineText(line)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">No PO items selected</p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 px-3 py-2">
        <p className="mb-1 text-[10px] font-bold uppercase text-gray-600">Files</p>
        <label className="flex cursor-pointer flex-col items-center rounded border border-dashed border-gray-300 px-3 py-3 text-xs text-gray-500 hover:bg-gray-50">
          <i className="ri-upload-2-line mb-1 text-base" aria-hidden />
          Upload files
          <input
            type="file"
            multiple
            className="sr-only"
            aria-label="Upload packlist files"
            onChange={(event) => onChange({ files: [...entry.files, ...Array.from(event.target.files || [])] })}
          />
        </label>
        {entry.savedFiles.length || entry.files.length ? (
          <ul className="mt-2 space-y-1">
            {entry.savedFiles.map((file) => (
              <li key={file.url || file.originalName} className="flex items-center justify-between text-xs text-gray-700">
                <span>{file.originalName}</span>
                <button type="button" className="text-red-600" aria-label={`Remove ${file.originalName}`} onClick={() => onChange({ savedFiles: entry.savedFiles.filter((item) => item !== file) })}>
                  Remove
                </button>
              </li>
            ))}
            {entry.files.map((file) => (
              <li key={`${file.name}-${file.size}`} className="flex items-center justify-between text-xs text-gray-700">
                <span>{file.name}</span>
                <button type="button" className="text-red-600" aria-label={`Remove ${file.name}`} onClick={() => onChange({ files: entry.files.filter((item) => item !== file) })}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
