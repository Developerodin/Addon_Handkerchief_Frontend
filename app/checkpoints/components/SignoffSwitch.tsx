'use client';

import React from 'react';

interface CheckpointCheckboxProps {
  checked: boolean;
  disabled: boolean;
  label: string;
  pending: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Checkbox for one spreadsheet column. The parent asks for confirmation before this runs.
 */
export default function CheckpointCheckbox({
  checked,
  disabled,
  label,
  pending,
  onChange,
}: CheckpointCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled || pending}
      aria-label={label}
      aria-busy={pending}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
