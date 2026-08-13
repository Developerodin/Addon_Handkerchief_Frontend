'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { helpSupportTasksService } from '@/shared/services/helpSupportTasksService';
import type { HelpSupportTask, HelpSupportTaskTeam, TaskPriority } from '@/shared/types/helpSupportTasks';
import HubFilterSelect from './HubFilterSelect';
import TaskDocumentUploader from './TaskDocumentUploader';

interface EditTaskModalProps {
  open: boolean;
  task: HelpSupportTask | null;
  onClose: () => void;
  onUpdated: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function toDateInputValue(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function EditTaskModal({ open, task, onClose, onUpdated }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTeams, setAssignedTeams] = useState<string[]>([]);
  const [teams, setTeams] = useState<HelpSupportTaskTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  useEffect(() => {
    if (!open || !task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setDueDate(toDateInputValue(task.dueDate));
    setAssignedTeams(task.assignedTeams || []);
  }, [open, task]);

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

  if (!open || !task) return null;

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
      await helpSupportTasksService.updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignedTeams,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      toast.success('Task updated');
      onClose();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachmentsUpdated = async (attachments: HelpSupportTask['attachments']) => {
    if (!task) return;
    try {
      await helpSupportTasksService.updateTask(task.id, { attachments });
      toast.success('Documents updated');
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save documents');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase text-indigo-600">{task.taskNumber}</p>
            <h2 className="text-base font-bold text-gray-900">Edit Task</h2>
            <p className="mt-1 text-xs text-gray-500">Update task details and team assignment.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            ) : (
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
                        <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-gray-700">Documents (optional)</p>
            <TaskDocumentUploader
              taskId={task.id}
              taskNumber={task.taskNumber}
              existingAttachments={task.attachments || []}
              disabled={submitting || uploadingDocs}
              onUploadingChange={setUploadingDocs}
              onAttachmentsChange={handleAttachmentsUpdated}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingDocs}
              className="inline-flex min-w-[130px] items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
