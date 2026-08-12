'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { helpSupportTasksService } from '@/shared/services/helpSupportTasksService';
import type { CreateTaskPayload, HelpSupportTaskTeam, TaskPriority } from '@/shared/types/helpSupportTasks';
import HubFilterSelect from './HubFilterSelect';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function CreateTaskModal({ open, onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTeams, setAssignedTeams] = useState<string[]>([]);
  const [teams, setTeams] = useState<HelpSupportTaskTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTeamsLoading(true);
    helpSupportTasksService
      .listTeams()
      .then((res) => setTeams(res.results || []))
      .catch(() => {
        toast.error('Could not load teams');
        setTeams([]);
      })
      .finally(() => setTeamsLoading(false));
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setAssignedTeams([]);
  };

  const toggleTeam = (slug: string) => {
    setAssignedTeams((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedTeams.length) {
      toast.error('Title and at least one team are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignedTeams,
        ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
      };
      await helpSupportTasksService.createTask(payload);
      toast.success('Task assigned');
      reset();
      onClose();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold text-gray-900">Assign Task</h2>
        <p className="mt-1 text-xs text-gray-500">Assign work to a team — all members of that team will see the task.</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title *"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          <HubFilterSelect
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            wrapperClassName="w-full"
            aria-label="Priority"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </HubFilterSelect>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-700">Assign to team *</p>
            {teamsLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-600" />
                Loading teams…
              </div>
            ) : teams.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {teams.map((team) => {
                  const selected = assignedTeams.includes(team.slug);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggleTeam(team.slug)}
                      className={`rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <i className={team.slug === 'dev_team' ? 'ri-code-line' : 'ri-team-line'} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                          {team.description && (
                            <p className="line-clamp-2 text-[10px] text-gray-500">{team.description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-semibold">No active teams available</p>
                <p className="mt-1 text-amber-800">
                  Open <strong>Teams</strong> (super admin) and click <strong>Activate</strong> on Management or Dev
                  Team, then try again.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-w-[130px] items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
