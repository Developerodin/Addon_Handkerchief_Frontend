'use client';

import React, { useMemo, useState } from 'react';
import { factoryRequest } from '@/shared/services/factoryApi';
import { planRackCodes } from './rackCodePlan';

export interface AddRacksDrawerProps {
  existingCodes: string[];
  onClose: () => void;
  onCreated: (created: number, skipped: number) => void;
}

const control = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

/**
 * Creates missing fabric racks for a block. Codes look like ST-B-A01-U001.
 */
export function AddRacksDrawer({ existingCodes, onClose, onCreated }: AddRacksDrawerProps) {
  const [location, setLocation] = useState('ST');
  const [floor, setFloor] = useState('B');
  const [block, setBlock] = useState('A');
  const [sectionStart, setSectionStart] = useState('1');
  const [sectionCount, setSectionCount] = useState('1');
  const [upperCount, setUpperCount] = useState('1');
  const [lowerCount, setLowerCount] = useState('0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const plan = useMemo(
    () => planRackCodes({ location, floor, block, sectionStart, sectionCount, upperCount, lowerCount }),
    [location, floor, block, sectionStart, sectionCount, upperCount, lowerCount],
  );
  const existing = useMemo(() => new Set(existingCodes.map((code) => code.toUpperCase())), [existingCodes]);
  const skipped = plan.codes.filter((code) => existing.has(code)).length;
  const creating = plan.codes.length - skipped;

  /**
   * Posts the block range. Existing codes are skipped on the server.
   */
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (plan.error) {
      setError(plan.error);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await factoryRequest<{ created: number; skipped: number }>('/store/rack-slots', {
        method: 'POST',
        body: JSON.stringify({
          location: plan.location,
          floor: plan.floor,
          block: plan.block,
          sectionStart: plan.sectionStart,
          sectionCount: plan.sectionCount,
          upperCount: plan.upperCount,
          lowerCount: plan.lowerCount,
        }),
      });
      onCreated(data.created || 0, data.skipped || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add racks');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close add racks" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="add-racks-title" className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="add-racks-title" className="text-base font-bold text-gray-900">Add racks</h2>
          <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-50" aria-label="Close" onClick={onClose}>
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </header>
        <form className="flex flex-1 flex-col" onSubmit={submit}>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Storage type</span>
              <input readOnly value="Fabric" aria-label="Storage type" className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Location" hint="ST is Sitapura" value={location} onChange={setLocation} />
              <TextField label="Floor" hint="B is basement" value={floor} onChange={setFloor} />
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Block</span>
              <input
                value={block}
                maxLength={1}
                aria-label="Block"
                placeholder="A"
                className={`${control} uppercase`}
                onChange={(event) => setBlock(event.target.value.toUpperCase())}
              />
              <span className="mt-1 block text-xs text-gray-500">One letter. A01 is block A, section 01.</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="First section" value={sectionStart} min={1} max={99} onChange={setSectionStart} />
              <NumberField label="How many sections" value={sectionCount} min={1} max={99} onChange={setSectionCount} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Upper racks" value={upperCount} min={0} max={99} onChange={setUpperCount} />
              <NumberField label="Lower racks" value={lowerCount} min={0} max={99} onChange={setLowerCount} />
            </div>
            <p className="text-xs text-gray-500">Upper 2 means U001 and U002. A later 5 adds only the missing codes. Lower racks use L001.</p>
            {plan.error ? <p className="text-sm text-red-600" role="alert">{plan.error}</p> : <CodePreview codes={plan.codes} skipped={skipped} creating={creating} />}
            {error && error !== plan.error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          </div>
          <footer className="border-t border-gray-100 p-4">
            <button type="submit" className="flex w-full items-center justify-center gap-1 rounded-md bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-50" disabled={saving || Boolean(plan.error)}>
              <i className="ri-add-line" aria-hidden />
              {saving ? 'Adding…' : creating ? `Add ${creating}` : 'Add'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

/**
 * Location or floor code. Stored uppercase with spaces removed.
 */
function TextField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        value={value}
        aria-label={label}
        className={`${control} uppercase`}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <span className="mt-1 block text-xs text-gray-500">{hint}</span>
    </label>
  );
}

/**
 * Integer field for a section or rack count.
 */
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        className={control}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

/**
 * First and last code in the range, plus how many already exist.
 */
function CodePreview({ codes, skipped, creating }: { codes: string[]; skipped: number; creating: number }) {
  const ends = codes.length > 1 ? `${codes[0]} … ${codes[codes.length - 1]}` : codes[0];
  const total = `${codes.length} rack${codes.length === 1 ? '' : 's'}`;
  return (
    <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
      <span className="font-medium text-gray-800">{total}</span>
      {' · '}
      {skipped} already exist
      {' · '}
      {creating} will be added
      <span className="mt-1 block font-mono text-[11px] text-gray-800">{ends}</span>
    </p>
  );
}
