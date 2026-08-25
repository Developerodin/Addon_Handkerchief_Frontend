'use client';

import { FabricLookupEditPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricTypeFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function EditFabricTypePage({ params }: { params: { id: string } }) {
  return <FabricLookupEditPage config={fabricTypeFormConfig} params={params} />;
}
