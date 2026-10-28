import type { CheckpointItem, SignOffColumn } from '@/shared/types/checkpoint';

/** Only this account can add, rename, or delete modules and checkpoints. */
export const CHECKPOINT_OWNER_EMAIL = 'superadmin@addon.in';

export interface SignOffRequest {
  item: CheckpointItem;
  column: SignOffColumn;
  checked: boolean;
}

const COLUMN_LABEL: Record<SignOffColumn, string> = {
  developer: 'Developer',
  addon: 'Addon team',
};

/**
 * True only for superadmin@addon.in. Everyone else can flip switches and nothing else.
 * @param email - Signed-in email
 */
export function canManageCheckpointStructure(email?: string): boolean {
  return email?.trim().toLowerCase() === CHECKPOINT_OWNER_EMAIL;
}

/**
 * Any signed-in user can flip either sign-off switch.
 * @param email - Signed-in email
 */
export function canToggleSignOff(email?: string): boolean {
  return Boolean(email?.trim());
}

/**
 * Formats a sign-off timestamp for the table and the log.
 * @param value - ISO date or empty
 */
export function formatSignoffTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Caption under a sign-off switch: who signed, and when.
 * @param name - Signer display name
 * @param at - ISO timestamp
 */
export function signerCaption(name?: string, at?: string | null): string {
  if (!name) return 'Not signed';
  return `${name} · ${formatSignoffTime(at)}`;
}

/**
 * Copy for the modal shown before a sign-off switch changes.
 * @param request - Checkpoint, column, and the next checked state
 */
export function signOffDialogCopy(request: SignOffRequest): {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
} {
  const who = COLUMN_LABEL[request.column];
  const title = request.item.title;
  if (request.checked) {
    return {
      title: 'Turn sign-off on',
      message: `Turn on the ${who} sign-off for “${title}”?`,
      confirmLabel: 'Turn on',
      tone: 'primary',
    };
  }
  return {
    title: 'Turn sign-off off',
    message: `Turn off the ${who} sign-off for “${title}”?`,
    confirmLabel: 'Turn off',
    tone: 'danger',
  };
}
