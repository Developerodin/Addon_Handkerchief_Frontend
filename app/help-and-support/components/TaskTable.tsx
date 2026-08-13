'use client';

import React, { useState } from 'react';
import type { HelpSupportTask, TaskPriority, TaskStatus } from '@/shared/types/helpSupportTasks';
import { formatHubDateTime, PRIORITY_COLORS, PRIORITY_LABELS } from '../helpSupportConstants';
import HubFilterSelect from './HubFilterSelect';

export interface TaskFilters {
  status: string;
  priority: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  in_progress: 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200',
  blocked: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  done: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  cancelled: 'bg-red-100 text-red-800 ring-1 ring-red-200',
};

const PAGE_SIZES = [10, 15, 25, 50, 100];

/** Shared pill size for status, priority, and team badges in the table. */
const TABLE_BADGE =
  'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold leading-none';

function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

interface TaskTableProps {
  tasks: HelpSupportTask[];
  loading?: boolean;
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  filters: TaskFilters;
  teamNameBySlug: Map<string, string>;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onFilterChange: (key: keyof TaskFilters, value: string) => void;
  onResetFilters: () => void;
  onOpenTask: (task: HelpSupportTask) => void;
  onEditTask?: (task: HelpSupportTask) => void;
  isManagement?: boolean;
  isSuperAdmin?: boolean;
  onTeamsClick?: () => void;
  onAssignClick?: () => void;
}

export default function TaskTable({
  tasks,
  loading,
  page,
  limit,
  totalPages,
  totalResults,
  filters,
  teamNameBySlug,
  onPageChange,
  onLimitChange,
  onFilterChange,
  onResetFilters,
  onOpenTask,
  onEditTask,
  isManagement = false,
  isSuperAdmin = false,
  onTeamsClick,
  onAssignClick,
}: TaskTableProps) {
  const [jump, setJump] = useState('');

  const hasActiveFilters =
    filters.status ||
    filters.priority ||
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.sortBy !== 'createdAt:desc';

  const formatTeamLabels = (task: HelpSupportTask) => {
    const slugs = task.assignedTeams || [];
    if (!slugs.length) return '—';
    return slugs.map((slug) => teamNameBySlug.get(slug) || slug.replace(/_/g, ' ')).join(', ');
  };

  const colSpan = isManagement && onEditTask ? 7 : 6;

  const goToJump = () => {
    const target = Number(jump);
    if (!Number.isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange(target);
    }
    setJump('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5">
        <div className="relative w-[11rem] shrink-0 sm:w-[12.5rem]">
          <i
            className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label="Search tasks"
          />
        </div>

        <HubFilterSelect
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          wrapperClassName="min-w-[8.5rem]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </HubFilterSelect>

        <HubFilterSelect
          value={filters.priority}
          onChange={(e) => onFilterChange('priority', e.target.value)}
          wrapperClassName="min-w-[8.5rem]"
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </HubFilterSelect>

        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onFilterChange('dateFrom', e.target.value)}
          className="w-[8.75rem] shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          aria-label="Created from"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onFilterChange('dateTo', e.target.value)}
          className="w-[8.75rem] shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          aria-label="Created to"
        />

        <HubFilterSelect
          value={filters.sortBy}
          onChange={(e) => onFilterChange('sortBy', e.target.value)}
          wrapperClassName="min-w-[9rem]"
          aria-label="Sort by"
        >
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
        </HubFilterSelect>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <i className="ri-close-line" aria-hidden /> Reset
          </button>
        )}

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          {isSuperAdmin && onTeamsClick && (
            <button
              type="button"
              onClick={onTeamsClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <i className="ri-team-line text-sm" aria-hidden />
              Teams
            </button>
          )}
          {isManagement && onAssignClick && (
            <button
              type="button"
              onClick={onAssignClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <i className="ri-add-line text-sm" aria-hidden />
              Assign Task
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" aria-label="Tasks">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Created</th>
                {isManagement && onEditTask && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
                  </td>
                </tr>
              ) : !tasks.length ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center">
                    <i className="ri-task-line text-3xl text-gray-300" aria-hidden />
                    <p className="mt-2 text-sm font-medium text-gray-600">No tasks found</p>
                    <p className="mt-1 text-xs text-gray-500">Try adjusting your filters.</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer transition hover:bg-indigo-50/50"
                    onClick={() => onOpenTask(task)}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900">{task.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-gray-500">{task.taskNumber}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`${TABLE_BADGE} ${STATUS_COLORS[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`${TABLE_BADGE} ${PRIORITY_COLORS[task.priority as TaskPriority]}`}>
                        {PRIORITY_LABELS[task.priority as TaskPriority]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {(task.assignedTeams || []).length ? (
                          (task.assignedTeams || []).map((slug) => (
                            <span
                              key={slug}
                              className={`${TABLE_BADGE} bg-violet-100 text-violet-800 ring-1 ring-violet-200`}
                            >
                              {teamNameBySlug.get(slug) || slug.replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">{formatTeamLabels(task)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">{formatHubDateTime(task.createdAt)}</td>
                    {isManagement && onEditTask && (
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                          aria-label={`Edit task ${task.taskNumber}`}
                        >
                          <i className="ri-pencil-line text-sm" aria-hidden />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>
            {totalResults === 0
              ? 'No results'
              : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, totalResults)} of ${totalResults}`}
          </span>
          <label className="flex items-center gap-1.5">
            <span className="text-gray-400">Rows</span>
            <HubFilterSelect
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              size="sm"
              wrapperClassName="min-w-[3.5rem]"
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </HubFilterSelect>
          </label>
        </div>

        {totalPages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Task pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <i className="ri-arrow-left-s-line" aria-hidden />
            </button>
            {buildPageList(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${
                    p === page
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <i className="ri-arrow-right-s-line" aria-hidden />
            </button>

            {totalPages > 10 && (
              <div className="ml-2 flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jump}
                  onChange={(e) => setJump(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goToJump();
                    }
                  }}
                  placeholder="Go"
                  className="h-8 w-14 rounded-lg border border-gray-300 px-2 text-center text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  aria-label="Go to page"
                />
                <button
                  type="button"
                  onClick={goToJump}
                  className="inline-flex h-8 items-center rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Go
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
