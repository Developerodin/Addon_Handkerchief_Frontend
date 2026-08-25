'use client';

import { FabricLookupEditPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricQualityFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function EditFabricQualityPage({ params }: { params: { id: string } }) {
  return <FabricLookupEditPage config={fabricQualityFormConfig} params={params} />;
}
