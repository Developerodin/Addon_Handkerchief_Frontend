"use client";

import ContentLayout from '@/app/(components)/(contentlayout)/layout';
import { setupCatalogAuth } from '@/shared/utils/setupAxiosAuth';
import { useEffect } from 'react';

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupCatalogAuth();
  }, []);

  return <ContentLayout>{children}</ContentLayout>;
}
