'use client';

import React from 'react';
import { cn } from './cn';

export interface UiSearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  wrapperClassName?: string;
}

export function UiSearchInput({ className, wrapperClassName, ...props }: UiSearchInputProps) {
  return (
    <div className={cn('ui-search-input-wrap', wrapperClassName)}>
      <input type="text" className={cn('ui-search-input', className)} {...props} />
      <i className="ri-search-line ui-search-input__icon" aria-hidden />
    </div>
  );
}

export default UiSearchInput;
