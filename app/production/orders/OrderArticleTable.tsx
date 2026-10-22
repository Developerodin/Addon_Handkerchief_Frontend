'use client';

import React from 'react';
import { ScopeRevision } from '@/shared/services/factoryApi';

export interface OrderArticleLine {
  key: string;
  articleCode: string;
  articleName: string;
  productionType: string;
  piecesPerCut: number;
  quantity: string;
  priority: string;
  remarks: string;
  revisionId: string;
  revisions: ScopeRevision[];
  unpublished: boolean;
  metres: string[];
}

/** Same 32px box for every order field. Theme form-control padding was stretching inputs past the selects. */
export const orderFieldClass =
  '!box-border !h-8 !min-h-8 !max-h-8 !w-full !rounded !border !border-gray-200 !bg-white !px-2 !py-0 !text-[11px] !font-medium !leading-[30px] !text-gray-900 outline-none focus:!border-purple-400 disabled:!cursor-not-allowed disabled:!bg-gray-50 disabled:!text-gray-700';

/**
 * Dense article grid matching the reference production-order editor.
 */
export function OrderArticleTable({
  lines,
  locked,
  pickLocked = locked,
  onAdd,
  onPick,
  onChange,
  onRemove,
}: {
  lines: OrderArticleLine[];
  locked: boolean;
  /** Search stays open when a released order has no article yet. */
  pickLocked?: boolean;
  onAdd: () => void;
  onPick: (index: number) => void;
  onChange: (index: number, patch: Partial<OrderArticleLine>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Articles ({lines.length})</h3>
        <button
          type="button"
          onClick={onAdd}
          disabled={locked}
          className="flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <i className="ri-add-line text-xs" aria-hidden /> Add Article
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-40 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Article #</th>
              <th className="w-24 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Qty</th>
              <th className="w-28 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Pieces / cut</th>
              <th className="w-28 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>
              <th className="w-44 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Revision</th>
              <th className="w-40 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Remarks</th>
              <th className="w-16 px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {lines.map((line, index) => (
              <tr key={line.key} className="hover:bg-gray-50">
                <td className="px-2 py-2 align-top">
                  <div className="flex items-start gap-1">
                    <input
                      aria-label="Article number"
                      readOnly
                      className={`${orderFieldClass} cursor-pointer bg-gray-50`}
                      value={line.articleCode}
                      placeholder="Click search"
                      onClick={() => {
                        if (!pickLocked) onPick(index);
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Search article"
                      title="Search and select article"
                      disabled={pickLocked}
                      onClick={() => onPick(index)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <i className="ri-search-line text-xs" aria-hidden />
                    </button>
                  </div>
                  {line.articleName ? (
                    <div className="mt-0.5 truncate text-[10px] text-gray-500" title={line.articleName}>
                      {line.articleName}
                    </div>
                  ) : null}
                  <div className="truncate text-[10px] capitalize text-gray-400">{line.productionType}</div>
                  {line.metres.map((text) => (
                    <div key={text} className="truncate text-[10px] text-gray-500">
                      {text}
                    </div>
                  ))}
                </td>
                <td className="px-2 py-2 align-top">
                  <input
                    aria-label="Quantity"
                    type="number"
                    min={1}
                    disabled={locked || !line.articleCode}
                    className={orderFieldClass}
                    value={line.quantity}
                    placeholder="0"
                    onChange={(event) => onChange(index, { quantity: event.target.value })}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <select
                    aria-label="Pieces per cut"
                    disabled={locked || !line.articleCode}
                    className={`${orderFieldClass} !pr-7`}
                    value={line.piecesPerCut}
                    onChange={(event) => onChange(index, { piecesPerCut: Number(event.target.value) })}
                  >
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </td>
                <td className="px-2 py-2 align-top">
                  <select
                    aria-label="Article priority"
                    disabled={!line.articleCode && locked}
                    className={`${orderFieldClass} !pr-7`}
                    value={line.priority}
                    onChange={(event) => onChange(index, { priority: event.target.value })}
                  >
                    {['Urgent', 'High', 'Medium', 'Low'].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2 align-top">
                  <select
                    aria-label="Revision"
                    disabled={locked || !line.articleCode}
                    className={`${orderFieldClass} !pr-7`}
                    value={line.revisionId}
                    onChange={(event) => onChange(index, { revisionId: event.target.value })}
                  >
                    <option value="">{line.unpublished ? 'Publish the item first' : 'Select revision'}</option>
                    {line.revisions.map((revision) => (
                      <option key={revision.id} value={revision.id}>
                        {revision.sequence} · {revision.reason || 'Published'}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2 align-top">
                  <input
                    aria-label="Remarks"
                    className={orderFieldClass}
                    placeholder="Remarks..."
                    value={line.remarks}
                    onChange={(event) => onChange(index, { remarks: event.target.value })}
                  />
                </td>
                <td className="px-2 py-2 text-center align-top">
                  <button
                    type="button"
                    aria-label={`Remove article ${line.articleCode || index + 1}`}
                    title="Remove article"
                    disabled={locked || lines.length === 1}
                    onClick={() => onRemove(line.key)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <i className="ri-delete-bin-line text-sm" aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
