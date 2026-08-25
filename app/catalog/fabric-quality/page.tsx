'use client';

import { FabricLookupListPage } from '@/shared/components/catalog/FabricLookupListPage';
import { fabricQualityListConfig } from '@/shared/config/fabricLookupConfigs';

export default function FabricQualityPage() {
  return <FabricLookupListPage config={fabricQualityListConfig} />;
}
