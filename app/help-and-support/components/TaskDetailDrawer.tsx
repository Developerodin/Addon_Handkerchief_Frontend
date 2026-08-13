'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { HelpSupportTask, TaskActivityEntry, TaskAttachment, TaskStatus } from '@/shared/types/helpSupportTasks';
import { helpSupportTasksService } from '@/shared/services/helpSupportTasksService';
import { userDisplayName } from '../helpSupportConstants';
import TaskStatusConfirmModal from './TaskStatusConfirmModal';
import AttachmentList from './AttachmentList';
import TaskDocumentUploader from './TaskDocumentUploader';

interface TaskDetailDrawerProps {
  task: HelpSupportTask | null;
  open: boolean;
  loading?: boolean;
  isManagement: boolean;
  teamNameBySlug: Map<string, string>;
  highlightComment?: boolean;
  onHighlightCommentDone?: () => void;
  onClose: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void> | void;
  onTaskUpdated: (task: HelpSupportTask) => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

function formatTeamList(slugs: string[] | undefined, teamNameBySlug: Map<string, string>) {
  if (!slugs?.length) return '';
  return slugs.map((slug) => teamNameBySlug.get(slug) || slug.replace(/_/g, ' ')).join(', ');
}

function collectKnownUserNames(task: HelpSupportTask): Map<string, string> {
  const map = new Map<string, string>();
  const add = (ref?: HelpSupportTask['createdBy']) => {
    if (!ref || typeof ref === 'string') return;
    const label = userDisplayName(ref);
    if (ref.id && label !== '—') map.set(ref.id, label);
  };
  add(task.createdBy);
  (task.assignees || []).forEach((ref) => add(ref));
  (task.comments || []).forEach((comment) => add(comment.author));
  (task.activityLog || []).forEach((entry) => {
    if (entry.actorName?.trim()) {
      const id = typeof entry.actor === 'string' ? entry.actor : entry.actor?.id;
      if (id) map.set(id, entry.actorName.trim());
    }
    add(entry.actor);
  });
  return map;
}

function resolveTimelineActor(entry: TaskActivityEntry, knownNames: Map<string, string>): string {
  if (entry.actorName?.trim()) return entry.actorName.trim();
  if (typeof entry.actor === 'string' && knownNames.has(entry.actor)) {
    return knownNames.get(entry.actor)!;
  }
  if (typeof entry.actor === 'object' && entry.actor?.id && knownNames.has(entry.actor.id)) {
    return knownNames.get(entry.actor.id)!;
  }
  const label = userDisplayName(entry.actor);
  return label === '—' ? 'Team member' : label;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildTimeline(task: HelpSupportTask, teamNameBySlug: Map<string, string>): TaskActivityEntry[] {
  const fromLog = [...(task.activityLog || [])];
  if (fromLog.length) {
    return fromLog.sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  }

  const fallback: TaskActivityEntry[] = [
    {
      id: 'created-fallback',
      type: 'created',
      actor: task.createdBy,
      createdAt: task.createdAt,
      message: task.assignedTeams?.length
        ? `Task created and assigned to ${formatTeamList(task.assignedTeams, teamNameBySlug)}`
        : 'Task created',
      teams: task.assignedTeams,
    },
  ];

  (task.comments || []).forEach((comment, index) => {
    fallback.push({
      id: comment.id || `comment-fallback-${index}`,
      type: 'comment',
      actor: comment.author,
      message: comment.body,
      createdAt: comment.createdAt,
    });
  });

  return fallback.sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
}

function timelineMeta(entry: TaskActivityEntry) {
  switch (entry.type) {
    case 'created':
      return {
        icon: 'ri-add-circle-line',
        tone: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
        title: 'Task created',
      };
    case 'status_changed':
      return {
        icon: 'ri-refresh-line',
        tone: 'text-indigo-600 bg-indigo-50 ring-indigo-100',
        title: 'Status updated',
      };
    case 'teams_assigned':
      return {
        icon: 'ri-team-line',
        tone: 'text-violet-600 bg-violet-50 ring-violet-100',
        title: 'Team assignment',
      };
    case 'comment':
      return {
        icon: 'ri-chat-3-line',
        tone: 'text-sky-600 bg-sky-50 ring-sky-100',
        title: 'Update posted',
      };
    default:
      return {
        icon: 'ri-history-line',
        tone: 'text-gray-600 bg-gray-50 ring-gray-100',
        title: 'Activity',
      };
  }
}

function timelineBody(entry: TaskActivityEntry, teamNameBySlug: Map<string, string>) {
  if (entry.type === 'status_changed') {
    const from = entry.fromStatus ? STATUS_LABELS[entry.fromStatus] : '—';
    const to = entry.toStatus ? STATUS_LABELS[entry.toStatus] : '—';
    return (
      <p className="text-sm text-gray-700">
        Changed status from <span className="font-semibold">{from}</span> to{' '}
        <span className="font-semibold">{to}</span>
      </p>
    );
  }
  if (entry.type === 'teams_assigned' && entry.teams?.length) {
    return (
      <p className="text-sm text-gray-700">
        Assigned to <span className="font-semibold">{formatTeamList(entry.teams, teamNameBySlug)}</span>
      </p>
    );
  }
  if (entry.message) {
    return <p className="whitespace-pre-wrap text-sm text-gray-700">{entry.message}</p>;
  }
  return null;
}

export default function TaskDetailDrawer({
  task,
  open,
  loading = false,
  isManagement,
  teamNameBySlug,
  highlightComment = false,
  onHighlightCommentDone,
  onClose,
  onStatusChange,
  onTaskUpdated,
  onRefresh,
}: TaskDetailDrawerProps) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const commentFormRef = useRef<HTMLFormElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const timeline = useMemo(
    () => (task ? buildTimeline(task, teamNameBySlug) : []),
    [task, teamNameBySlug]
  );

  const knownUserNames = useMemo(() => (task ? collectKnownUserNames(task) : new Map()), [task]);

  useEffect(() => {
    if (!highlightComment || !open) return;
    const timer = window.setTimeout(() => {
      commentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      commentInputRef.current?.focus();
      onHighlightCommentDone?.();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightComment, open, onHighlightCommentDone]);

  if (!open || !task) return null;

  const teamLabels = formatTeamList(task.assignedTeams, teamNameBySlug) || '—';

  const handleNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      const updated = await helpSupportTasksService.addComment(task.id, note.trim());
      setNote('');
      toast.success('Update added to timeline');
      onTaskUpdated(updated);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStatus = async () => {
    if (!pendingStatus) return;
    setStatusBusy(true);
    try {
      await onStatusChange(task.id, pendingStatus);
      setPendingStatus(null);
    } finally {
      setStatusBusy(false);
    }
  };

  const handleAttachmentsUpdated = async (attachments: TaskAttachment[]) => {
    if (!isManagement) return;
    try {
      const updated = await helpSupportTasksService.updateTask(task.id, { attachments });
      onTaskUpdated(updated);
      onRefresh();
      toast.success('Documents updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save documents');
    }
  };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-gray-900/50" />
      <div className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[520px]">
        <div className="border-b px-5 py-4">
          <p className="text-[10px] font-bold uppercase text-indigo-600">{task.taskNumber}</p>
          <h2 className="text-base font-bold text-gray-900">{task.title}</h2>
          {task.description && <p className="mt-2 text-sm text-gray-600">{task.description}</p>}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-500">Assigned team</p>
            <p className="text-sm font-medium text-gray-800">{teamLabels}</p>
          </div>

          {(task.attachments?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase text-gray-500">Documents</p>
              <AttachmentList attachments={task.attachments as import('@/shared/types/helpSupport').TicketAttachment[]} />
            </div>
          )}

          {isManagement && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase text-gray-500">Add documents (optional)</p>
              <TaskDocumentUploader
                taskId={task.id}
                taskNumber={task.taskNumber}
                existingAttachments={task.attachments || []}
                onUploadingChange={setUploadingDocs}
                onAttachmentsChange={handleAttachmentsUpdated}
              />
            </div>
          )}

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase text-gray-500">Update status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  disabled={task.status === value || statusBusy}
                  onClick={() => setPendingStatus(value)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                    task.status === value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase text-gray-500">Activity timeline</p>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                Loading activity…
              </div>
            ) : !timeline.length ? (
              <p className="text-xs text-gray-400">No activity yet</p>
            ) : (
              <ol className="relative space-y-0 border-l-2 border-indigo-100 pl-4">
                {timeline.map((entry, index) => {
                  const meta = timelineMeta(entry);
                  const actorName = resolveTimelineActor(entry, knownUserNames);
                  const isLast = index === timeline.length - 1;
                  return (
                    <li key={entry.id || `${entry.type}-${index}`} className={`relative ${isLast ? '' : 'pb-5'}`}>
                      <span
                        className={`absolute -left-[1.35rem] flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white ${meta.tone}`}
                      >
                        <i className={`${meta.icon} text-sm`} aria-hidden />
                      </span>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-gray-900">
                              {meta.title}
                              <span className="font-semibold text-indigo-700"> · {actorName}</span>
                            </p>
                          </div>
                          <time className="shrink-0 text-[10px] text-gray-500">{formatWhen(entry.createdAt)}</time>
                        </div>
                        <div className="mt-2">{timelineBody(entry, teamNameBySlug)}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        <form
          ref={commentFormRef}
          onSubmit={handleNote}
          className={`border-t p-4 transition-shadow duration-500 ${
            highlightComment ? 'ring-2 ring-inset ring-indigo-400 ring-offset-2' : ''
          }`}
        >
          <label htmlFor="task-note" className="mb-1 block text-xs font-semibold text-gray-600">
            Add update to timeline
            {highlightComment && (
              <span className="ml-2 font-normal text-indigo-600">Status updated — add a comment?</span>
            )}
          </label>
          <textarea
            id="task-note"
            ref={commentInputRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write an update for the team…"
            rows={2}
            disabled={uploadingDocs}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={submitting || uploadingDocs}
            className="mt-2 inline-flex min-w-[130px] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post Update'}
          </button>
        </form>
      </div>

      {pendingStatus && (
        <TaskStatusConfirmModal
          open
          fromStatus={task.status}
          toStatus={pendingStatus}
          busy={statusBusy}
          onConfirm={handleConfirmStatus}
          onCancel={() => !statusBusy && setPendingStatus(null)}
        />
      )}
    </div>
  );
}
