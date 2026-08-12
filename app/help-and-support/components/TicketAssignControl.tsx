'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { helpSupportService } from '@/shared/services/helpSupportService';
import { userService, type User } from '@/shared/services/userService';
import type { HelpSupportTicket } from '@/shared/types/helpSupport';
import {
  isEmptyUserRef,
  isTicketAssigneeRole,
  ticketAssigneeRoleLabel,
  userDisplayName,
} from '../helpSupportConstants';
import HubFilterSelect from './HubFilterSelect';

interface TicketAssignControlProps {
  ticketId: string;
  currentAssignee?: HelpSupportTicket['assignedTo'];
  currentUserId?: string;
  onAssigned: () => void;
}

function currentAssigneeId(assignee?: HelpSupportTicket['assignedTo']): string {
  if (!assignee || typeof assignee === 'string') return typeof assignee === 'string' ? assignee : '';
  return assignee.id || '';
}

/**
 * Management control to assign a ticket to Management or Dev team members.
 */
export default function TicketAssignControl({
  ticketId,
  currentAssignee,
  currentUserId,
  onAssigned,
}: TicketAssignControlProps) {
  const [assignees, setAssignees] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);

  const assignedId = currentAssigneeId(currentAssignee);

  useEffect(() => {
    setSelectedId(assignedId);
  }, [assignedId]);

  const loadAssignees = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await userService.getUsers({ limit: 200, sortBy: 'name:asc' });
      const list: User[] = res.results || res.users || [];
      setAssignees(list.filter((u) => isTicketAssigneeRole(u.role)));
    } catch {
      toast.error('Could not load team members for assignment');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadAssignees();
  }, [loadAssignees]);

  const assigneeOptions = useMemo(
    () =>
      assignees.map((user) => ({
        id: user.id,
        label: `${user.name || user.email} (${ticketAssigneeRoleLabel(user.role)})`,
      })),
    [assignees]
  );

  const runAssign = async (assigneeId: string | null) => {
    setBusy(true);
    try {
      await helpSupportService.assignTicket(ticketId, assigneeId);
      toast.success(assigneeId ? 'Ticket assigned' : 'Assignment cleared');
      onAssigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = () => {
    if (!selectedId) {
      toast.error('Select a team member to assign');
      return;
    }
    if (selectedId === assignedId) {
      toast.error('Ticket is already assigned to this person');
      return;
    }
    runAssign(selectedId);
  };

  const handleAssignToMe = () => {
    if (!currentUserId) return;
    setSelectedId(currentUserId);
    runAssign(currentUserId);
  };

  const handleUnassign = () => {
    setSelectedId('');
    runAssign(null);
  };

  const currentLabel = isEmptyUserRef(currentAssignee as { name?: string; email?: string })
    ? 'Unassigned'
    : userDisplayName(currentAssignee as { name?: string; email?: string });

  return (
    <section className="rounded-xl border border-gray-300 bg-white shadow-sm" aria-label="Assign ticket">
      <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <i className="ri-user-shared-line text-sm" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Assign ticket</h3>
          <p className="text-[11px] text-gray-500">
            Currently: <span className="font-semibold text-gray-700">{currentLabel}</span>
          </p>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {loadingUsers ? (
          <p className="text-xs text-gray-500">Loading team members…</p>
        ) : !assigneeOptions.length ? (
          <p className="text-xs text-gray-500">No assignable users found.</p>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="ticket-assignee" className="block text-xs font-bold text-gray-700">
                Assign to
              </label>
              <HubFilterSelect
                id="ticket-assignee"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                wrapperClassName="w-full"
                disabled={busy}
              >
                <option value="">Select team member…</option>
                {assigneeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </HubFilterSelect>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedId || busy}
                onClick={handleAssign}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="ri-check-line" aria-hidden />
                Assign
              </button>
              {currentUserId && currentUserId !== assignedId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAssignToMe}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                >
                  Assign to me
                </button>
              )}
              {assignedId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleUnassign}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Unassign
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
