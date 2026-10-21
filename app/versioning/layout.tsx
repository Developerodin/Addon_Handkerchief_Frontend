"use client";

import ContentLayout from '@/app/(components)/(contentlayout)/layout';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';

/**
 * Gates the revision review screen on the navigation flag.
 */
export default function VersioningLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContentLayout>
      <RequireCrudPermission path="Revision review" action="read">
        {children}
      </RequireCrudPermission>
    </ContentLayout>
  );
}
