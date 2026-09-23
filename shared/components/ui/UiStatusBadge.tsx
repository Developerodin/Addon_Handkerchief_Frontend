'use client';

import React from 'react';
import { cn } from './cn';

export interface UiStatusBadgeProps {
  status: string;
  className?: string;
}

export function UiStatusBadge({ status, className }: UiStatusBadgeProps) {
  const normalized = status.toLowerCase();
  const isActive = normalized === 'active' || normalized === 'open' || normalized === 'completed';

  return (
    <span
      className={cn(
        'ui-status-badge',
        isActive ? 'ui-status-badge--active' : 'ui-status-badge--inactive',
        className
      )}
    >
      {status}
    </span>
  );
}

export default UiStatusBadge;
