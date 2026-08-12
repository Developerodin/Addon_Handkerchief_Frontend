import type { TicketDisposition, TicketPriority, TicketStatus } from '@/shared/types/helpSupport';

/** Display labels for ticket statuses */
export const STATUS_LABELS: Record<TicketStatus, string> = {
  raised: 'Raised',
  pending: 'Pending',
  in_progress: 'In Progress',
  in_review: 'In Review',
  on_hold: 'On Hold',
  awaiting_user: 'Awaiting User',
  resolved: 'Resolved',
  reopened: 'Reopened',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

/** Tailwind chip classes per status */
export const STATUS_COLORS: Record<TicketStatus, string> = {
  raised: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  in_review: 'bg-purple-100 text-purple-800',
  on_hold: 'bg-gray-100 text-gray-700',
  awaiting_user: 'bg-orange-100 text-orange-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  reopened: 'bg-rose-100 text-rose-800',
  closed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
};

export const DISPOSITION_LABELS: Record<TicketDisposition, string> = {
  unset: 'Unset',
  user_set_path: 'User Set Path',
  completed: 'Completed',
  pending_discussion: 'Pending Discussion',
  needs_more_info: 'Needs More Info',
  duplicate: 'Duplicate',
  not_reproducible: 'Not Reproducible',
  wont_fix: "Won't Fix",
  deferred: 'Deferred',
  escalated: 'Escalated',
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

/** Human labels for priority */
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

import { resolveHubFileVisual as resolveVisual } from '@/shared/utils/hubFileDisplay';

/**
 * Maps a MIME type to a Remix icon class for attachment display.
 * @param mimeType - File MIME type
 * @returns Remix icon class name
 */
export const attachmentIcon = (mimeType?: string, fileName?: string): string => {
  return resolveVisual(fileName, mimeType).icon;
};

/** Human labels for category */
export const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'New Feature Request',
  how_to: 'How To',
  data_issue: 'Data Issue',
  access: 'Access',
  other: 'Other',
};

/** Solid dot colors per status (for timelines / indicators) */
export const STATUS_DOT: Record<TicketStatus, string> = {
  raised: 'bg-blue-500',
  pending: 'bg-amber-500',
  in_progress: 'bg-indigo-500',
  in_review: 'bg-violet-500',
  on_hold: 'bg-gray-400',
  awaiting_user: 'bg-orange-500',
  resolved: 'bg-emerald-500',
  reopened: 'bg-rose-500',
  closed: 'bg-slate-500',
  cancelled: 'bg-red-500',
};

/** Solid dot color per priority */
export const PRIORITY_DOT: Record<TicketPriority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-sky-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

/**
 * Build up-to-two-letter initials from a populated user or string.
 * @param user - Populated user, id string, or null
 */
export function userInitials(user?: { name?: string; email?: string } | string | null): string {
  const label = userDisplayName(user);
  if (!label || label === '—') return '?';
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic avatar background classes keyed by a string */
const AVATAR_PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];

/**
 * Pick a stable avatar color class from a seed string.
 * @param seed - Any identifying string (name/email/id)
 */
export function avatarColor(seed?: string): string {
  if (!seed) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash];
}

/** Super-admin email with full ticket management access */
export const HELP_SUPPORT_SUPER_EMAIL = 'admin@addon.in';

/** Management side roles */
export const MANAGEMENT_ROLES = new Set(['accounts', 'admin', 'super_admin']);

/** Dev team role */
export const DEV_TEAM_ROLES = new Set(['user']);

/** Roles that can manage all tickets and analytics (Management) */
export const AGENT_ROLES = MANAGEMENT_ROLES;

/** Roles that can delete tickets and assign anyone */
export const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/**
 * Normalize role string from auth (handles superadmin variants).
 * @param role - Raw role from user object
 */
export function normalizeHelpSupportRole(role?: string): string | undefined {
  if (!role) return undefined;
  const normalized = role.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'superadmin') return 'super_admin';
  return normalized;
}

/**
 * Whether the current user is Management side.
 */
export function isManagementSide(role?: string, email?: string): boolean {
  return isHelpSupportAgent(role, email);
}

/**
 * Whether the current user is Dev team side.
 */
export function isDevTeamSide(role?: string): boolean {
  const normalized = normalizeHelpSupportRole(role);
  return Boolean(normalized && DEV_TEAM_ROLES.has(normalized));
}

/**
 * Whether the current user is Management (all tickets, status, analytics).
 */
export function isHelpSupportAgent(role?: string, email?: string): boolean {
  if (email?.trim().toLowerCase() === HELP_SUPPORT_SUPER_EMAIL) return true;
  const normalized = normalizeHelpSupportRole(role);
  return Boolean(normalized && AGENT_ROLES.has(normalized));
}

/**
 * Whether the user may delete help & support tickets (admin@addon.in only).
 * @param email - User email from auth state
 */
export function canDeleteHelpSupportTickets(email?: string): boolean {
  return email?.trim().toLowerCase() === HELP_SUPPORT_SUPER_EMAIL;
}

/**
 * Whether the user has full admin ticket powers (delete, assign anyone).
 * @param role - User role from auth state
 * @param email - User email
 */
export function isHelpSupportAdmin(role?: string, email?: string): boolean {
  if (email?.trim().toLowerCase() === HELP_SUPPORT_SUPER_EMAIL) return true;
  const normalized = normalizeHelpSupportRole(role);
  return Boolean(normalized && ADMIN_ROLES.has(normalized));
}

/** Roles that may be assigned help & support tickets */
const TICKET_ASSIGNEE_ROLES = new Set([...AGENT_ROLES, ...DEV_TEAM_ROLES]);

export function isTicketAssigneeRole(role?: string): boolean {
  const normalized = normalizeHelpSupportRole(role);
  return Boolean(normalized && TICKET_ASSIGNEE_ROLES.has(normalized));
}

/** Human-readable role label for assignee picker */
export function ticketAssigneeRoleLabel(role?: string): string {
  const normalized = normalizeHelpSupportRole(role);
  if (!normalized) return 'User';
  if (DEV_TEAM_ROLES.has(normalized)) return 'Dev team';
  if (normalized === 'accounts') return 'Management';
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'super_admin') return 'Super admin';
  return normalized.replace(/_/g, ' ');
}

/** Super admin only — manage task teams configuration */
export function isHelpSupportSuperAdmin(role?: string, email?: string): boolean {
  if (email?.trim().toLowerCase() === HELP_SUPPORT_SUPER_EMAIL) return true;
  return normalizeHelpSupportRole(role) === 'super_admin';
}

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/**
 * Resolve display name from populated user or id.
 * Never surfaces raw MongoDB ids in the UI.
 */
export function userDisplayName(
  user?: { name?: string; email?: string; id?: string; _id?: string } | string | null
): string {
  if (!user) return '—';
  if (typeof user === 'string') {
    if (OBJECT_ID_RE.test(user)) return '—';
    return user;
  }
  const name = user.name?.trim();
  const email = user.email?.trim();
  if (name) return name;
  if (email) return email;
  return '—';
}

/** True when a user ref is missing or could not be resolved to a profile. */
export function isEmptyUserRef(
  user?: { name?: string; email?: string; id?: string; _id?: string } | string | null
): boolean {
  if (!user) return true;
  if (typeof user === 'string') return OBJECT_ID_RE.test(user);
  return !user.name?.trim() && !user.email?.trim();
}

/** Human-readable created/updated timestamp for tickets and tasks. */
export function formatHubDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Disposition label; unset tickets show as "Not set". */
export function formatDispositionLabel(disposition?: string | null): string {
  if (!disposition || disposition === 'unset') return 'Not set';
  return DISPOSITION_LABELS[disposition as TicketDisposition] || disposition.replace(/_/g, ' ');
}
