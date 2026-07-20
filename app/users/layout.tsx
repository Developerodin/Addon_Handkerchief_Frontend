"use client";

import ContentLayout from '@/app/(components)/(contentlayout)/layout';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContentLayout>
      <RequireCrudPermission path="Users" action="read">
        {children}
      </RequireCrudPermission>
    </ContentLayout>
  );
}
