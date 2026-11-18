/**
 * Production lifecycle (floors / final checking). Not the same as factory dispatch.
 * Draft is unsaved-for-the-floor. Pending is released and not yet on a floor.
 */
export function orderStatusLabel(status: string): string {
  if (status === 'pending') return 'Draft';
  if (status === 'released') return 'Pending';
  if (status === 'in-progress' || status === 'amended') return 'In progress';
  if (status === 'on-hold') return 'On hold';
  if (status === 'closed') return 'Production complete';
  return status;
}

/**
 * Shipped quantity from packing & dispatch (boxes marked dispatched).
 */
export function dispatchStatusLabel(dispatchStatus?: string | null): string {
  if (dispatchStatus === 'complete') return 'Fully shipped';
  if (dispatchStatus === 'partial') return 'Partially shipped';
  return 'Not shipped';
}

/**
 * Priority pill colours. Urgent and High share the red pill.
 */
export function priorityTone(priority?: string): string {
  if (priority === 'Urgent' || priority === 'High') return 'bg-red-100 text-red-800';
  if (priority === 'Low') return 'bg-green-100 text-green-800';
  return 'bg-yellow-100 text-yellow-800';
}

/**
 * Short date for an order header.
 */
export function orderDateLabel(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
}
