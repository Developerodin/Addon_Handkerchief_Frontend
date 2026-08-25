'use client';

import { FabricLookupEditPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricMeasurementFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function EditFabricMeasurementPage({ params }: { params: { id: string } }) {
  return <FabricLookupEditPage config={fabricMeasurementFormConfig} params={params} />;
}
