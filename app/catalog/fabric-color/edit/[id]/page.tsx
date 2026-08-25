'use client';

import { FabricLookupEditPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricColorFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function EditFabricColorPage({ params }: { params: { id: string } }) {
  return <FabricLookupEditPage config={fabricColorFormConfig} params={params} />;
}
