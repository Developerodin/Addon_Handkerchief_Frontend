'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  helpSupportNotificationService,
  type HubNotification,
} from '@/shared/services/helpSupportNotificationService';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/app/help-and-support/helpSupportConstants';
import { useNavigation, canAccessHelpSupport, canAccessHelpSupportTab } from '@/shared/contextapi/navigationContext';
import type { HubTabSlug } from '@/shared/types/permissions';
import { useSelector } from 'react-redux';
import type { RootState } from '@/shared/redux/store';

const TEAM_LABELS: Record<string, string> = {
  management: 'Management',
  dev_team: 'Dev Team',
};

function formatTeams(slugs?: string[]) {
  if (!slugs?.length) return '—';
  return slugs.map((slug) => TEAM_LABELS[slug] || slug.replace(/_/g, ' ')).join(', ');
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function notificationTabForItem(item: HubNotification): HubTabSlug {
  return item.type === 'task_created' ? 'tasks' : 'tickets';
}

function canViewNotification(
  item: HubNotification,
  permissions: Parameters<typeof canAccessHelpSupportTab>[0],
  role?: string
) {
  return canAccessHelpSupportTab(permissions, notificationTabForItem(item), role);
}

function notificationHref(
  item: HubNotification,
  permissions: Parameters<typeof canAccessHelpSupportTab>[0],
  role?: string
): string | null {
  if (!canAccessHelpSupport(permissions, role)) return null;
  if (!canViewNotification(item, permissions, role)) return null;
  if (item.type === 'task_created') {
    return `/help-and-support?tab=tasks&taskId=${encodeURIComponent(item.taskId)}`;
  }
  return `/help-and-support/${encodeURIComponent(item.ticketId)}/`;
}

function notificationMeta(item: HubNotification) {
  if (item.type === 'task_created') {
    return {
      label: 'New task',
      icon: 'ri-task-line',
      subtitle: (
        <>
          For <span className="font-semibold">{formatTeams(item.assignedTeams)}</span>
        </>
      ),
      ref: item.taskNumber,
    };
  }
  return {
    label: 'Ticket assigned',
    icon: 'ri-customer-service-2-line',
    subtitle: <>Assigned to you</>,
    ref: item.ticketNumber,
  };
}

export default function TaskNotificationsBell() {
  const { permissions } = useNavigation();
  const user = useSelector((state: RootState) => state.auth.user);
  const hasHubAccess = canAccessHelpSupport(permissions, user?.role);
  const canSeeTaskNotifications = canAccessHelpSupportTab(permissions, 'tasks', user?.role);
  const canSeeTicketNotifications = canAccessHelpSupportTab(permissions, 'tickets', user?.role);
  const showBell = hasHubAccess && (canSeeTaskNotifications || canSeeTicketNotifications);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<HubNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user || !showBell) return;
    setLoading(true);
    try {
      const res = await helpSupportNotificationService.list(15);
      const visible = (res.results || []).filter((item) =>
        canViewNotification(item, permissions, user?.role)
      );
      setItems(visible);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, showBell, permissions]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      try {
        await helpSupportNotificationService.markRead();
        setUnreadCount(0);
      } catch {
        // non-blocking
      }
    }
  };

  if (!user || !showBell) return null;

  return (
    <div ref={panelRef} className="header-element relative !items-center py-[1rem] md:px-[0.65rem] px-2">
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-7 w-7 flex-shrink-0 items-center justify-center !rounded-full font-medium"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <i className="ri-notification-3-line header-link-icon !m-0 !flex !h-7 !w-7 !items-center !justify-center !p-0 !text-xl leading-none" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[200] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm font-bold text-gray-900">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto bg-gray-50/60 p-3">
            {loading && !items.length ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-500">
                Loading…
              </p>
            ) : !items.length ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-500">
                No notifications yet
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {items.map((item) => {
                  const meta = notificationMeta(item);
                  const href = notificationHref(item, permissions, user?.role);
                  const cardClass =
                    'rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md';
                  const content = (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700">
                          <i className={`${meta.icon} text-base`} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                            {meta.label}
                          </p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{item.title}</p>
                          <p className="mt-1 text-[11px] text-gray-600">{meta.subtitle}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[item.priority]}`}
                        >
                          {PRIORITY_LABELS[item.priority]}
                        </span>
                        <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                          {meta.ref}
                        </span>
                        <span className="ml-auto text-[10px] font-medium text-gray-400">
                          {formatWhen(item.createdAt)}
                        </span>
                      </div>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {href ? (
                        <Link
                          href={href}
                          className={`block ${cardClass} hover:bg-indigo-50/40`}
                          onClick={() => setOpen(false)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className={cardClass}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
