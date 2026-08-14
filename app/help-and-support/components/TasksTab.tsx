'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { helpSupportTasksService } from '@/shared/services/helpSupportTasksService';
import type { HelpSupportTask, HelpSupportTaskTeam, TaskStatus } from '@/shared/types/helpSupportTasks';
import { useHelpSupportCrud } from '@/shared/hooks/useHelpSupportCrud';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';
import ManageTeamsModal from './ManageTeamsModal';
import TaskDetailDrawer from './TaskDetailDrawer';
import TaskTable, { type TaskFilters } from './TaskTable';

interface TasksTabProps {
  isManagement: boolean;
  isSuperAdmin: boolean;
  initialTaskId?: string;
}

const DEFAULT_FILTERS: TaskFilters = {
  status: '',
  priority: '',
  search: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'createdAt:desc',
};

/**
 * Task assignment between teams (Management, Dev Team, etc.).
 */
export default function TasksTab({ isManagement, isSuperAdmin, initialTaskId }: TasksTabProps) {
  const { canCreate, canUpdate } = useHelpSupportCrud('Tasks');
  const [tasks, setTasks] = useState<HelpSupportTask[]>([]);
  const [teams, setTeams] = useState<HelpSupportTaskTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<HelpSupportTask | null>(null);
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HelpSupportTask | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [highlightComment, setHighlightComment] = useState(false);

  const openTask = useCallback(async (task: HelpSupportTask) => {
    setSelectedTask(task);
    setTaskDetailLoading(true);
    setHighlightComment(false);
    try {
      const full = await helpSupportTasksService.getTask(task.id);
      setSelectedTask(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load task details');
    } finally {
      setTaskDetailLoading(false);
    }
  }, []);

  const openEditTask = useCallback(async (task: HelpSupportTask) => {
    setTaskToEdit(task);
    setEditModalOpen(true);
    try {
      const full = await helpSupportTasksService.getTask(task.id);
      setTaskToEdit(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load task for editing');
    }
  }, []);

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
        page,
        limit,
        sortBy: filters.sortBy,
        ...(filters.status && { status: filters.status as TaskStatus }),
        ...(filters.priority && { priority: filters.priority as HelpSupportTask['priority'] }),
        ...(filters.search.trim() && { search: filters.search.trim() }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      });
      setTasks(res.results);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!initialTaskId) return;
    helpSupportTasksService
      .getTask(initialTaskId)
      .then((task) => openTask(task))
      .catch(() => {
        // ignore invalid deep link
      });
  }, [initialTaskId, openTask]);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await helpSupportTasksService.updateStatus(taskId, status);
      toast.success('Status updated');
      load();
      if (selectedTask?.id === taskId) {
        const updated = await helpSupportTasksService.getTask(taskId);
        setSelectedTask(updated);
        setHighlightComment(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleFilterChange = (key: keyof TaskFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <TaskTable
        tasks={tasks}
        loading={loading}
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalResults={totalResults}
        filters={filters}
        teamNameBySlug={teamNameBySlug}
        isManagement={isManagement}
        isSuperAdmin={isSuperAdmin}
        onTeamsClick={canUpdate ? () => setTeamsModalOpen(true) : undefined}
        onAssignClick={canCreate ? () => setModalOpen(true) : undefined}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        onFilterChange={handleFilterChange}
        onResetFilters={() => {
          setFilters(DEFAULT_FILTERS);
          setPage(1);
        }}
        onOpenTask={openTask}
        onEditTask={isManagement && canUpdate ? openEditTask : undefined}
      />

      <CreateTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
      <EditTaskModal
        open={editModalOpen}
        task={taskToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setTaskToEdit(null);
        }}
        onUpdated={() => {
          load();
          if (taskToEdit && selectedTask?.id === taskToEdit.id) {
            helpSupportTasksService.getTask(taskToEdit.id).then(setSelectedTask).catch(() => {});
          }
        }}
      />
      <ManageTeamsModal open={teamsModalOpen} onClose={() => setTeamsModalOpen(false)} onUpdated={loadTeams} />

      <TaskDetailDrawer
        task={selectedTask}
        open={Boolean(selectedTask)}
        loading={taskDetailLoading}
        isManagement={isManagement}
        canUpdate={canUpdate}
        teamNameBySlug={teamNameBySlug}
        highlightComment={highlightComment}
        onHighlightCommentDone={() => setHighlightComment(false)}
        onClose={() => {
          setSelectedTask(null);
          setHighlightComment(false);
        }}
        onStatusChange={handleStatusChange}
        onTaskUpdated={setSelectedTask}
        onRefresh={load}
      />
    </div>
  );
}
