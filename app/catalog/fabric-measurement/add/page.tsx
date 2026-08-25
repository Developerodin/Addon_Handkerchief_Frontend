'use client';

import { FabricLookupAddPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricMeasurementFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function AddFabricMeasurementPage() {
  return <FabricLookupAddPage config={fabricMeasurementFormConfig} />;
}
