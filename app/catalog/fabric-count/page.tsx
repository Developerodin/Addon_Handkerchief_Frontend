'use client';

import { FabricLookupListPage } from '@/shared/components/catalog/FabricLookupListPage';
import { fabricCountListConfig } from '@/shared/config/fabricLookupConfigs';

export default function FabricCountPage() {
  return <FabricLookupListPage config={fabricCountListConfig} />;
}
