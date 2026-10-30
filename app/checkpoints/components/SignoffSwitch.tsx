'use client';

import React from 'react';

interface CheckpointCheckboxProps {
  checked: boolean;
  disabled: boolean;
  label: string;
  pending: boolean;
  /** Visible signer name. Empty when nobody has signed. */
  signerName?: string;
  /** Full "name · time" caption, exposed to screen readers and the pointer tooltip. */
  signerDetail?: string;
  onChange: (checked: boolean) => void;
}

/**
 * Cell-sized sign-off control. The label fills the spreadsheet cell so the hit target is the cell, not a 16px box.
 */
export default function CheckpointCheckbox({
  checked,
  disabled,
  label,
  pending,
  signerName,
  signerDetail,
  onChange,
}: CheckpointCheckboxProps) {
  const status = pending ? 'Saving…' : checked ? 'Signed' : 'Open';

  return (
    <label
      className={`flex min-h-11 w-full cursor-pointer flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-center ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      } ${checked ? 'bg-[#f0fdf4] dark:bg-[#052e16]' : ''}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || pending}
        aria-busy={pending}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-[#4b5563] text-[rgb(132,90,223)] focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
      />
      <span className="sr-only">
        {label}, {status}
        {signerDetail ? `, ${signerDetail}` : ''}
      </span>
      {checked ? (
        <span aria-hidden className="text-[13px] font-medium leading-4 text-[#14532d] dark:text-[#bbf7d0]">
          {status}
        </span>
      ) : null}
      {checked && signerName ? (
        <span
          aria-hidden
          title={signerDetail || signerName}
          className="max-w-[9.5rem] truncate text-[12px] font-normal leading-4 text-[#374151] dark:text-[#d1d1d6]"
        >
          {signerName}
        </span>
      ) : null}
    </label>
  );
}
