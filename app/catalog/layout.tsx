"use client";

import ContentLayout from '@/app/(components)/(contentlayout)/layout';
import { setupCatalogAuth } from '@/shared/utils/setupAxiosAuth';

// Register axios/fetch auth interceptors before child page effects run.
setupCatalogAuth();

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <ContentLayout>{children}</ContentLayout>;
}
