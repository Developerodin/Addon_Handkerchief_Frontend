'use client';

import { FabricLookupListPage } from '@/shared/components/catalog/FabricLookupListPage';
import { fabricYarnCountListConfig } from '@/shared/config/fabricLookupConfigs';

export default function FabricYarnCountPage() {
  return <FabricLookupListPage config={fabricYarnCountListConfig} />;
}
