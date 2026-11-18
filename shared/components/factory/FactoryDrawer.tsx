'use client';

import React, { useEffect } from 'react';
import { UiStatusBadge } from '@/shared/components/ui';

/**
 * Right-hand sheet for floor work: calm header, scroll body, optional sticky footer.
 */
export function FactoryDrawer({
  title,
  subtitle,
  status,
  open,
  wide,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  open: boolean;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="ui-factory-drawer__backdrop fixed inset-0 z-50 flex justify-end"
      role="presentation"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`ui-factory-drawer__panel ui-panel flex h-full w-full max-w-md flex-col overflow-hidden bg-white sm:max-w-lg ${wide ? 'md:max-w-3xl' : 'md:max-w-xl'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-factory-drawer__grabber hidden sm:block" aria-hidden />
        <header className="ui-factory-drawer__header flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-[#1d1d1f]">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-sm font-medium text-[#6e6e73]">{subtitle}</p> : null}
            {status ? (
              <div className="mt-2">
                <UiStatusBadge status={status} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6e6e73] transition hover:bg-[#f2f2f7] hover:text-[#1d1d1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))]"
            aria-label="Close"
            onClick={onClose}
          >
            <i className="ri-close-line text-xl leading-none" aria-hidden />
          </button>
        </header>
        <div className="ui-factory-drawer__body flex-1 overflow-y-auto">{children}</div>
        {footer ? <div className="ui-drawer-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}

/**
 * Grouped card section inside a floor drawer.
 */
export function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ui-drawer-section">
      <h3 className="ui-drawer-section__title">{title}</h3>
      <div className="ui-drawer-section__body">{children}</div>
    </section>
  );
}

/**
 * Metric tile in a drawer overview grid.
 */
export function DrawerStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="ui-floor-stat">
      <p className="ui-floor-stat__label">{label}</p>
      <p className="ui-floor-stat__value">{value}</p>
    </div>
  );
}

/**
 * Sticky action row at the bottom of a drawer.
 */
export function DrawerFooter({ children }: { children: React.ReactNode }) {
  return <div className="ui-drawer-footer">{children}</div>;
}