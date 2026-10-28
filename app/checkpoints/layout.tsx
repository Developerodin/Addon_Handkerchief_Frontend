'use client';

import ContentLayout from '@/app/(components)/(contentlayout)/layout';
import { setupCatalogAuth } from '@/shared/utils/setupAxiosAuth';

setupCatalogAuth();

/**
 * Shell for the checkpoint list: auth, sidebar, and the API token interceptor.
 */
export default function CheckpointsLayout({ children }: { children: React.ReactNode }) {
  return <ContentLayout>{children}</ContentLayout>;
}
