'use client';

import React from 'react';
import { UiStatusBadge } from '@/shared/components/ui';

/**
 * Right-hand drawer matching the reference GRN and activity panels:
 * gray header bar, icon close, gray body, bordered sections.
 */
export function FactoryDrawer({
  title,
  subtitle,
  status,
  open,
  wide,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  open: boolean;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`ui-panel flex h-full w-full flex-col overflow-hidden border-l-2 border-gray-300 bg-white shadow-xl ${wide ? 'max-w-4xl' : 'max-w-3xl'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-gray-300 bg-gray-50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="ui-page-accent" aria-hidden />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-gray-800">{title}</h2>
              {subtitle ? <p className="truncate text-[11px] text-gray-500">{subtitle}</p> : null}
            </div>
            {status ? <UiStatusBadge status={status} /> : null}
          </div>
          <button
            type="button"
            className="rounded border-2 border-gray-300 p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
            onClick={onClose}
          >
            <i className="ri-close-line text-lg leading-none" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto bg-gray-50 p-3">{children}</div>
      </aside>
    </div>
  );
}

/**
 * White card with the gray section bar used inside reference drawers.
 */
export function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-md border-2 border-gray-300 bg-white">
      <h3 className="border-b-2 border-gray-300 bg-gray-200 px-3 py-1.5 text-[11px] font-bold uppercase text-gray-800">{title}</h3>
      {children}
    </section>
  );
}

/**
 * One metric tile in a drawer overview.
 */
export function DrawerStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border-2 border-gray-300 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value}</p>
    </div>
  );
}
