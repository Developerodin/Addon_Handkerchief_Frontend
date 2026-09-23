'use client';

import React from 'react';
import { UiButton } from './UiButton';
import { cn } from './cn';

export interface UiFormFooterProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  isLoading?: boolean;
  sticky?: boolean;
  className?: string;
}

export function UiFormFooter({
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  onCancel,
  isLoading,
  sticky = true,
  className,
}: UiFormFooterProps) {
  return (
    <div className={cn('ui-form-footer', sticky && 'ui-form-footer--sticky', className)}>
      <UiButton type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </UiButton>
      <UiButton type="submit" variant="primary" loading={isLoading} disabled={isLoading}>
        {isLoading ? 'Saving...' : submitLabel}
      </UiButton>
    </div>
  );
}

export default UiFormFooter;
