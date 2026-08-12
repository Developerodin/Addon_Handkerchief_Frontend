'use client';

import RequireAuth from '@/shared/components/auth/RequireAuth';
import { RequireHelpSupportAccess } from '@/shared/components/auth/RequireHelpSupportAccess';
import { NavigationProvider } from '@/shared/contextapi/navigationContext';
import Link from 'next/link';

/**
 * Standalone layout for Help & Support — opens in its own tab without the main app sidebar.
 */
export default function HelpSupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <NavigationProvider>
        <RequireHelpSupportAccess>
          <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <i className="ri-customer-service-2-line text-xl text-purple-600" aria-hidden />
                <span className="font-bold text-gray-900">Handkerchief Help & Support</span>
              </div>
              <Link
                href="/dashboards/main"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <i className="ri-arrow-left-line text-sm" aria-hidden />
                Back to main app
              </Link>
            </header>
            <main>{children}</main>
          </div>
        </RequireHelpSupportAccess>
      </NavigationProvider>
    </RequireAuth>
  );
}
