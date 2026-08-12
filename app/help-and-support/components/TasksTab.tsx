'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { helpSupportTasksService } from '@/shared/services/helpSupportTasksService';
import type { HelpSupportTask, HelpSupportTaskTeam, TaskPriority, TaskStatus } from '@/shared/types/helpSupportTasks';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../helpSupportConstants';
import CreateTaskModal from './CreateTaskModal';
import ManageTeamsModal from './ManageTeamsModal';
import TaskDetailDrawer from './TaskDetailDrawer';
import HubFilterSelect from './HubFilterSelect';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-indigo-100 text-indigo-800',
  blocked: 'bg-amber-100 text-amber-800',
  done: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface TasksTabProps {
  isManagement: boolean;
  isSuperAdmin: boolean;
}

/**
 * Task assignment between teams (Management, Dev Team, etc.).
 */
export default function TasksTab({ isManagement, isSuperAdmin }: TasksTabProps) {
  const [tasks, setTasks] = useState<HelpSupportTask[]>([]);
  const [teams, setTeams] = useState<HelpSupportTaskTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HelpSupportTask | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);

  const openTask = async (task: HelpSupportTask) => {
    setSelectedTask(task);
    setTaskDetailLoading(true);
    try {
      const full = await helpSupportTasksService.getTask(task.id);
      setSelectedTask(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load task details');
    } finally {
      setTaskDetailLoading(false);
    }
  };

  const teamNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((team) => map.set(team.slug, team.name));
    return map;
  }, [teams]);

  const loadTeams = useCallback(async () => {
    try {
      const res = await helpSupportTasksService.listTeams();
      setTeams(res.results || []);
    } catch {
      // non-blocking
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await helpSupportTasksService.listTasks({
        limit: 50,
        ...(statusFilter && { status: statusFilter }),
        sortBy: 'createdAt:desc',
      });
      setTasks(res.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    load();
  }, [load]);

  const formatTeamLabels = (task: HelpSupportTask) => {
    const slugs = task.assignedTeams || [];
    if (!slugs.length) return '—';
    return slugs.map((slug) => teamNameBySlug.get(slug) || slug.replace(/_/g, ' ')).join(', ');
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await helpSupportTasksService.updateStatus(taskId, status);
      toast.success('Status updated');
      load();
      if (selectedTask?.id === taskId) {
        const updated = await helpSupportTasksService.getTask(taskId);
        setSelectedTask(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HubFilterSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          wrapperClassName="min-w-[9.5rem]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </HubFilterSelect>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setTeamsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <i className="ri-team-line text-base" aria-hidden />
              Teams
            </button>
          )}
          {isManagement && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <i className="ri-add-line text-base" aria-hidden />
              Assign Task
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      ) : !tasks.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <i className="ri-task-line text-4xl text-gray-300" aria-hidden />
          <p className="mt-3 text-sm font-medium text-gray-600">No tasks yet</p>
          <p className="mt-1 text-xs text-gray-500">
            {isManagement ? 'Assign work to a team from here.' : 'Tasks assigned to your team will appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr key={task.id} className="cursor-pointer hover:bg-indigo-50/40" onClick={() => openTask(task)}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.taskNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLORS[task.status]}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${PRIORITY_COLORS[task.priority as TaskPriority]}`}>
                      {PRIORITY_LABELS[task.priority as TaskPriority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatTeamLabels(task)}</td>
                  <td className="px-4 py-3 text-gray-600">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
      <ManageTeamsModal
        open={teamsModalOpen}
        onClose={() => setTeamsModalOpen(false)}
        onUpdated={loadTeams}
      />

      <TaskDetailDrawer
        task={selectedTask}
        open={Boolean(selectedTask)}
        loading={taskDetailLoading}
        isManagement={isManagement}
        teamNameBySlug={teamNameBySlug}
        onClose={() => setSelectedTask(null)}
        onStatusChange={handleStatusChange}
        onTaskUpdated={setSelectedTask}
        onRefresh={load}
      />
    </div>
  );
}
