'use client';

import React from 'react';

interface SignoffSwitchProps {
  checked: boolean;
  disabled: boolean;
  label: string;
  pending: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Accessible switch for a Developer or Addon sign-off.
 */
export default function SignoffSwitch({
  checked,
  disabled,
  label,
  pending,
  onChange,
}: SignoffSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={pending}
      disabled={disabled || pending}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-indigo-600' : 'bg-gray-300'
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
