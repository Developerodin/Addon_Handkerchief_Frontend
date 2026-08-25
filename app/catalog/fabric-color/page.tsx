'use client';

import { FabricLookupListPage } from '@/shared/components/catalog/FabricLookupListPage';
import { fabricColorListConfig } from '@/shared/config/fabricLookupConfigs';

export default function FabricColorPage() {
  return <FabricLookupListPage config={fabricColorListConfig} />;
}
