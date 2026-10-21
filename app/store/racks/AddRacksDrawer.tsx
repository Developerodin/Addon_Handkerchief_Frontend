'use client';

import React, { useState } from 'react';
import { factoryRequest } from '@/shared/services/factoryApi';

export interface AddRacksDrawerProps {
  sections: string[];
  floors: string[];
  onClose: () => void;
  onCreated: (count: number) => void;
}

/**
 * Creates the next batch of fabric racks in one section and floor.
 */
export function AddRacksDrawer({ sections, floors, onClose, onCreated }: AddRacksDrawerProps) {
  const [section, setSection] = useState(sections[0] || '');
  const [custom, setCustom] = useState('');
  const [floor, setFloor] = useState(floors[0] || '');
  const [customFloor, setCustomFloor] = useState('');
  const [count, setCount] = useState('1');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const usingNew = section === '__new__';
  const usingNewFloor = floor === '__new__';
  const zonePreview = (usingNew ? custom : section).trim().toUpperCase();
  const floorPreview = (usingNewFloor ? customFloor : floor).trim().toUpperCase().replace(/\s+/g, '');

  /**
   * Posts the section, floor, and count, then closes on success.
   */
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const zone = (usingNew ? custom : section).trim();
    const level = (usingNewFloor ? customFloor : floor).trim();
    const total = Number(count);
    if (!zone) {
      setError('Enter a section');
      return;
    }
    if (!level) {
      setError('Enter a floor');
      return;
    }
    if (!Number.isInteger(total) || total < 1 || total > 50) {
      setError('Add between 1 and 50 racks');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await factoryRequest('/store/rack-slots', {
        method: 'POST',
        body: JSON.stringify({ zone, floor: level, count: total }),
      });
      onCreated(total);
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
          <div className="flex-1 space-y-4 px-5 py-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Storage type</span>
              <input readOnly value="Fabric" aria-label="Storage type" className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Section</span>
              <select aria-label="Section" value={section} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" onChange={(event) => setSection(event.target.value)}>
                <option value="">Select a section</option>
                {sections.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                <option value="__new__">New section</option>
              </select>
            </label>
            {usingNew ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">New section code</span>
                <input
                  value={custom}
                  aria-label="New section code"
                  placeholder="B7-02"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase"
                  onChange={(event) => setCustom(event.target.value.toUpperCase())}
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Floor</span>
              <select aria-label="Floor" value={floor} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" onChange={(event) => setFloor(event.target.value)}>
                <option value="">Select a floor</option>
                {floors.map((level) => <option key={level} value={level}>{level}</option>)}
                <option value="__new__">New floor</option>
              </select>
            </label>
            {usingNewFloor ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">New floor</span>
                <input
                  value={customFloor}
                  aria-label="New floor"
                  placeholder="F01"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase"
                  onChange={(event) => setCustomFloor(event.target.value.toUpperCase())}
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Number of racks to add (1–50)</span>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                aria-label="Number of racks to add"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                onChange={(event) => setCount(event.target.value)}
              />
            </label>
            {zonePreview && floorPreview ? (
              <p className="text-xs text-gray-500">Codes look like {zonePreview}-R0001-{floorPreview}</p>
            ) : null}
            {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          </div>
          <footer className="border-t border-gray-100 p-4">
            <button type="submit" className="flex w-full items-center justify-center gap-1 rounded-md bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-50" disabled={saving}>
              <i className="ri-add-line" aria-hidden />
              {saving ? 'Adding…' : 'Add'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
