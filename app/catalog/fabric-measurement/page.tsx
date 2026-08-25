'use client';

import { FabricLookupListPage } from '@/shared/components/catalog/FabricLookupListPage';
import { fabricMeasurementListConfig } from '@/shared/config/fabricLookupConfigs';

export default function FabricMeasurementPage() {
  return <FabricLookupListPage config={fabricMeasurementListConfig} />;
}
