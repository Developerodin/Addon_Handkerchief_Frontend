'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { helpSupportTasksService } from '@/shared/services/helpSupportTasksService';
import type { HelpSupportTaskTeam } from '@/shared/types/helpSupportTasks';

interface ManageTeamsModalProps {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function isTeamActive(team: HelpSupportTaskTeam): boolean {
  return team.isActive !== false;
}

export default function ManageTeamsModal({ open, onClose, onUpdated }: ManageTeamsModalProps) {
  const [teams, setTeams] = useState<HelpSupportTaskTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await helpSupportTasksService.listTeams(true);
      setTeams(res.results || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadTeams();
  }, [open]);

  if (!open) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await helpSupportTasksService.createTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        roles: roles
          .split(',')
          .map((r) => r.trim().toLowerCase())
          .filter(Boolean),
      });
      toast.success('Team created');
      setName('');
      setDescription('');
      setRoles('');
      await loadTeams();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const setTeamActive = async (team: HelpSupportTaskTeam, nextActive: boolean) => {
    try {
      await helpSupportTasksService.updateTeam(team.id, { isActive: nextActive });
      toast.success(nextActive ? `${team.name} is now active` : `${team.name} is now inactive`);
      await loadTeams();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update team');
    }
  };

  const activateAllTeams = async () => {
    try {
      await Promise.all(teams.filter((t) => !isTeamActive(t)).map((t) => helpSupportTasksService.updateTeam(t.id, { isActive: true })));
      toast.success('All teams activated');
      await loadTeams();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate teams');
    }
  };

  const allInactive = teams.length > 0 && teams.every((t) => !isTeamActive(t));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">Task Teams</h2>
          <p className="mt-1 text-xs text-gray-500">Configure teams tasks can be assigned to. Super admin only.</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {allInactive && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-900">
                All teams are <strong>inactive</strong>, so Assign Task shows no teams.
              </p>
              <button
                type="button"
                onClick={activateAllTeams}
                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Activate all teams
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
            </div>
          ) : (
            <ul className="space-y-2">
              {teams.map((team) => {
                const active = isTeamActive(team);
                return (
                  <li
                    key={team.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">{team.slug}</p>
                      {team.description && <p className="mt-1 text-xs text-gray-600">{team.description}</p>}
                      {team.roles?.length ? (
                        <p className="mt-1 text-[10px] text-gray-400">Roles: {team.roles.join(', ')}</p>
                      ) : null}
                      <p className="mt-2 text-[10px] text-gray-500">
                        {active
                          ? 'This team appears in Assign Task.'
                          : 'Inactive teams are hidden from Assign Task.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTeamActive(team, !active)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                        active
                          ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {active ? 'Deactivate' : 'Activate'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Add team</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name (e.g. QA Team)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              required
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              placeholder="Roles, comma-separated (e.g. user, admin)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-w-[120px] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Team'}
            </button>
          </form>
        </div>

        <div className="flex justify-end border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
