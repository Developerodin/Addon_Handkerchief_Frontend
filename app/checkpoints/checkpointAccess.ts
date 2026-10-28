import type { CheckpointItem, SignOffColumn } from '@/shared/types/checkpoint';

/** Only this account can add, rename, or delete modules and checkpoints. */
export const CHECKPOINT_OWNER_EMAIL = 'superadmin@addon.in';

export interface SignOffRequest {
  item: CheckpointItem;
  column: SignOffColumn;
  checked: boolean;
}

const COLUMN_LABEL: Record<SignOffColumn, string> = {
  developed: 'Developed',
  testedOdin: 'Tested by Odin',
  testedAddon: 'Tested by Addon team',
  implemented: 'Implemented',
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
 * Label for a log column, including the old Developer and Addon values.
 * @param column - Stored column name
 */
export function logColumnLabel(column: string): string {
  if (column === 'developer') return 'Developed';
  if (column === 'addon') return 'Tested by Addon team';
  return COLUMN_LABEL[column as SignOffColumn] || column;
}

/**
 * One-line description of a log entry.
 * @param column - Stored column
 * @param checked - Value that was saved
 */
export function logAction(column: string, checked: boolean): string {
  if (column === 'implemented') return checked ? 'set Implemented to Yes' : 'set Implemented to No';
  return `${checked ? 'checked' : 'unchecked'} ${logColumnLabel(column)}`;
}

/**
 * Copy for the modal shown before a checkbox or Yes/No change.
 * @param request - Checkpoint, column, and the next value
 */
export function signOffDialogCopy(request: SignOffRequest): {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
} {
  const title = request.item.title;
  if (request.column === 'implemented') {
    return request.checked
      ? {
          title: 'Mark implemented',
          message: `Set Implemented to Yes for “${title}”?`,
          confirmLabel: 'Yes',
          tone: 'primary',
        }
      : {
          title: 'Mark not implemented',
          message: `Set Implemented to No for “${title}”?`,
          confirmLabel: 'No',
          tone: 'danger',
        };
  }
  const who = COLUMN_LABEL[request.column];
  return request.checked
    ? {
        title: `Check ${who}`,
        message: `Check ${who} for “${title}”?`,
        confirmLabel: 'Check',
        tone: 'primary',
      }
    : {
        title: `Uncheck ${who}`,
        message: `Uncheck ${who} for “${title}”?`,
        confirmLabel: 'Uncheck',
        tone: 'danger',
      };
}
