'use client';

import React, { useEffect, useId, useState } from 'react';

export type CheckpointFormMode =
  | { kind: 'module'; moduleId?: string; name: string }
  | { kind: 'item'; itemId?: string; moduleId: string; title: string; description: string };

interface CheckpointFormModalProps {
  mode: CheckpointFormMode;
  onClose: () => void;
  onSubmit: (mode: CheckpointFormMode) => Promise<void>;
}

/**
 * Modal for creating or editing a module name, or a checkpoint title and description.
 */
export default function CheckpointFormModal({ mode, onClose, onSubmit }: CheckpointFormModalProps) {
  const titleId = useId();
  const [name, setName] = useState(mode.kind === 'module' ? mode.name : '');
  const [title, setTitle] = useState(mode.kind === 'item' ? mode.title : '');
  const [description, setDescription] = useState(mode.kind === 'item' ? mode.description : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = mode.kind === 'module' ? Boolean(mode.moduleId) : Boolean(mode.itemId);
  const heading =
    mode.kind === 'module'
      ? isEdit
        ? 'Rename module'
        : 'New module'
      : isEdit
        ? 'Edit checkpoint'
        : 'New checkpoint';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /**
   * Validates the open form and submits it.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode.kind === 'module' && !name.trim()) {
      setError('Module name is required');
      return;
    }
    if (mode.kind === 'item' && !title.trim()) {
      setError('Checkpoint title is required');
      return;
    }
    setSaving(true);
    try {
      if (mode.kind === 'module') {
        await onSubmit({ ...mode, name: name.trim() });
      } else {
        await onSubmit({ ...mode, title: title.trim(), description: description.trim() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {heading}
        </h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {mode.kind === 'module' ? (
            <label className="block text-sm font-medium text-gray-700">
              Module name
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Fabric Management"
              />
            </label>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700">
                Title
                <input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="PO receive saves the lot"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What this checkpoint covers"
                />
              </label>
            </>
          )}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
