'use client';

import React from 'react';
import type { CheckpointItem, SignOffColumn } from '@/shared/types/checkpoint';
import { signerCaption } from '../checkpointAccess';
import SignoffSwitch from './SignoffSwitch';

interface CheckpointTableProps {
  items: CheckpointItem[];
  canManage: boolean;
  canDeveloper: boolean;
  canAddon: boolean;
  pendingKey: string | null;
  onSignOff: (item: CheckpointItem, column: SignOffColumn, checked: boolean) => void;
  onEdit: (item: CheckpointItem) => void;
  onDelete: (item: CheckpointItem) => void;
  onLogs: (item: CheckpointItem) => void;
}

/**
 * Table of checkpoints inside one module.
 */
export default function CheckpointTable({
  items,
  canManage,
  canDeveloper,
  canAddon,
  pendingKey,
  onSignOff,
  onEdit,
  onDelete,
  onLogs,
}: CheckpointTableProps) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-gray-500">No checkpoints in this module yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3">Title</th>
            <th scope="col" className="px-4 py-3">Description</th>
            <th scope="col" className="px-4 py-3">Developer</th>
            <th scope="col" className="px-4 py-3">Addon team</th>
            <th scope="col" className="px-4 py-3">Complete</th>
            <th scope="col" className="px-4 py-3">Log</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 align-top">
              <th scope="row" className="px-4 py-3 font-medium text-gray-900">
                <div className="max-w-xs">{item.title}</div>
                {canManage ? (
                  <div className="mt-2 flex gap-2 text-xs font-normal">
                    <button
                      type="button"
                      className="text-indigo-600 hover:text-indigo-800"
                      onClick={() => onEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => onDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </th>
              <td className="max-w-sm px-4 py-3 whitespace-pre-wrap text-gray-600">
                {item.description || '—'}
              </td>
              <td className="px-4 py-3">
                <div title={canDeveloper ? 'Developer sign-off' : 'Sign in to change this'}>
                  <SignoffSwitch
                    checked={item.developerChecked}
                    disabled={!canDeveloper}
                    pending={pendingKey === `${item.id}:developer`}
                    label={`Developer sign-off for ${item.title}`}
                    onChange={(checked) => onSignOff(item, 'developer', checked)}
                  />
                </div>
                <p className="mt-1 max-w-[12rem] text-xs text-gray-500">
                  {signerCaption(item.developerCheckedByName, item.developerCheckedAt)}
                </p>
              </td>
              <td className="px-4 py-3">
                <div title={canAddon ? 'Addon team sign-off' : 'Sign in to change this'}>
                  <SignoffSwitch
                    checked={item.addonChecked}
                    disabled={!canAddon}
                    pending={pendingKey === `${item.id}:addon`}
                    label={`Addon team sign-off for ${item.title}`}
                    onChange={(checked) => onSignOff(item, 'addon', checked)}
                  />
                </div>
                <p className="mt-1 max-w-[12rem] text-xs text-gray-500">
                  {signerCaption(item.addonCheckedByName, item.addonCheckedAt)}
                </p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.complete ? 'Complete' : 'Open'}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={() => onLogs(item)}
                  aria-label={`View sign-off log for ${item.title}`}
                >
                  View log
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
