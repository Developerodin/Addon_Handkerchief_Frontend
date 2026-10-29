'use client';

import React from 'react';

interface CheckpointSheetBarProps {
  name: string;
  done: number;
  total: number;
  shown: number;
  query: string;
  canManage: boolean;
  onQuery: (value: string) => void;
  onAdd: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const quietButton =
  'inline-flex min-h-8 items-center rounded-md border border-[#c8ccd3] bg-white px-2.5 text-[13px] font-semibold text-[#1f2937] hover:bg-[#f4f6f8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(132,90,223)] dark:border-[#3a3a3c] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:hover:bg-[#3a3a3c]';

/**
 * Sheet toolbar: progress, a row filter, and the actions for this module.
 */
export default function CheckpointSheetBar({
  name,
  done,
  total,
  shown,
  query,
  canManage,
  onQuery,
  onAdd,
  onRename,
  onDelete,
}: CheckpointSheetBarProps) {
  const filtering = query.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#c8ccd3] bg-white px-3 py-2 dark:border-[#3a3a3c] dark:bg-[#1c1c1e]">
      <h2 className="text-[15px] font-semibold leading-5 text-[#111827] dark:text-[#f5f5f7]">{name}</h2>
      <p className="text-[13px] leading-5 text-[#374151] dark:text-[#d1d1d6]">
        {filtering ? `${shown} of ${total} rows` : `${done} of ${total} complete`}
      </p>
      <label className="ms-auto flex min-h-8 items-center gap-2 text-[13px] font-medium text-[#1f2937] dark:text-[#f5f5f7]">
        Filter
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Feature or note"
          className="h-8 w-44 rounded-md border border-[#c8ccd3] bg-white px-2 text-[13px] font-normal text-[#111827] placeholder:text-[#6b7280] focus:border-[rgb(132,90,223)] focus:outline-none focus:ring-2 focus:ring-[rgb(132,90,223)] sm:w-56 dark:border-[#3a3a3c] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]"
        />
      </label>
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-8 items-center rounded-md bg-[rgb(132,90,223)] px-3 text-[13px] font-semibold text-white hover:bg-[rgb(118,74,214)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(132,90,223)] focus-visible:ring-offset-2"
            onClick={onAdd}
          >
            Add checkpoint…
          </button>
          <button type="button" className={quietButton} onClick={onRename}>
            Rename…
          </button>
          <button
            type="button"
            className="inline-flex min-h-8 items-center rounded-md px-2.5 text-[13px] font-semibold text-[#991b1b] hover:bg-[#fef2f2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b] dark:text-[#fca5a5] dark:hover:bg-[#3f1212]"
            onClick={onDelete}
          >
            Delete module
          </button>
        </div>
      ) : null}
    </div>
  );
}
