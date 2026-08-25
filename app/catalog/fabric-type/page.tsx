'use client';

import { FabricLookupListPage } from '@/shared/components/catalog/FabricLookupListPage';
import { fabricTypeListConfig } from '@/shared/config/fabricLookupConfigs';

export default function FabricTypePage() {
  return <FabricLookupListPage config={fabricTypeListConfig} />;
}
