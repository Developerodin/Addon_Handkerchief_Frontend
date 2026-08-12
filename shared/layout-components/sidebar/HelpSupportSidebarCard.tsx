'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/shared/redux/store';
import { useNavigation, canAccessHelpSupport } from '@/shared/contextapi/navigationContext';

const HELP_SUPPORT_PATH = '/help-and-support';

/**
 * Pinned bottom card in the sidebar for Help & Support (opens in a new tab).
 */
export default function HelpSupportSidebarCard() {
  const { permissions, isLoading } = useNavigation();
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = canAccessHelpSupport(permissions, user?.role);

  if (isLoading) {
    return (
      <div className="help-support-sidebar-card" aria-hidden>
        <div className="help-support-sidebar-card__link animate-pulse opacity-60">
          <span className="help-support-sidebar-card__icon" />
          <span className="help-support-sidebar-card__content">
            <span className="help-support-sidebar-card__title">Help & Support</span>
          </span>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="help-support-sidebar-card" aria-label="Help and Support">
      <Link
        href={HELP_SUPPORT_PATH}
        target="_blank"
        rel="noopener noreferrer"
        className="help-support-sidebar-card__link"
        aria-label="Open Help and Support in a new tab"
      >
        <span className="help-support-sidebar-card__icon" aria-hidden>
          <i className="ri-customer-service-2-line" />
        </span>
        <span className="help-support-sidebar-card__content">
          <span className="help-support-sidebar-card__title">Help & Support</span>
          <span className="help-support-sidebar-card__subtitle">Files · Tasks · Tickets</span>
        </span>
        <span className="help-support-sidebar-card__arrow" aria-hidden>
          <i className="ri-external-link-line" />
        </span>
      </Link>
    </div>
  );
}
