'use client';

import { FabricLookupListPage } from '@/shared/components/catalog/FabricLookupListPage';
import { fabricYarnListConfig } from '@/shared/config/fabricLookupConfigs';

export default function FabricYarnPage() {
  return <FabricLookupListPage config={fabricYarnListConfig} />;
}
