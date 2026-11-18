'use client';

import React from 'react';
import { cn } from './cn';

export interface UiStatusBadgeProps {
  status: string;
  className?: string;
}

const GOOD = new Set([
  'active',
  'open',
  'completed',
  'production complete',
  'released',
  'approved',
  'passed',
  'received',
  'stored',
  'dispatched',
  'fully shipped',
  'qc-passed',
  'closed',
]);
const WAIT = new Set(['draft', 'pending', 'pending-cutoff', 'submitted to vendor', 'in transit', 'amended', 'partially received', 'on-rack', 'issued', 'in-progress', 'in progress', 'on hold', 'on-hold']);

/**
 * Maps a status string onto the shared green, amber, or red badge.
 */
function badgeTone(status: string) {
  const normalized = status.toLowerCase();
  if (GOOD.has(normalized)) return 'ui-status-badge--active';
  if (WAIT.has(normalized)) return 'ui-status-badge--pending';
  return 'ui-status-badge--inactive';
}

export function UiStatusBadge({ status, className }: UiStatusBadgeProps) {
  return (
    <span className={cn('ui-status-badge', badgeTone(status), className)}>
      {status}
    </span>
  );
}

export default UiStatusBadge;
