'use client';

import React from 'react';

type HubFilterSelectSize = 'sm' | 'md';

interface HubFilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Tailwind min-width utility, e.g. min-w-[10.5rem] */
  wrapperClassName?: string;
  size?: HubFilterSelectSize;
}

const fieldSizeClasses: Record<HubFilterSelectSize, string> = {
  sm: 'py-1 pl-2 pr-7 text-xs',
  md: 'py-2 pl-3 pr-9 text-sm',
};

const iconSizeClasses: Record<HubFilterSelectSize, string> = {
  sm: 'right-1.5 text-sm',
  md: 'right-2.5 text-base',
};

/**
 * Styled native select with a single chevron and safe text padding.
 * Avoids overlap from theme globals that add padding without hiding the native arrow.
 */
export default function HubFilterSelect({
  wrapperClassName = '',
  size = 'md',
  className = '',
  children,
  ...props
}: HubFilterSelectProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${wrapperClassName}`}>
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border border-gray-300 bg-white font-normal text-gray-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${fieldSizeClasses[size]} ${className}`}
      >
        {children}
      </select>
      <i
        className={`ri-arrow-down-s-line pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 ${iconSizeClasses[size]}`}
        aria-hidden
      />
    </div>
  );
}
