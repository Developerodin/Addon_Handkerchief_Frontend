'use client';

import ContentLayout from '@/app/(components)/(contentlayout)/layout';
import { setupCatalogAuth } from '@/shared/utils/setupAxiosAuth';

setupCatalogAuth();

/**
 * Shell for factory screens: auth, sidebar, and the API token interceptor.
 */
export default function FactoryLayout({ children }: { children: React.ReactNode }) {
  return <ContentLayout>{children}</ContentLayout>;
}
