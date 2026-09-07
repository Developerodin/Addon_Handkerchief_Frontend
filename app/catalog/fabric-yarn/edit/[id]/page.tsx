'use client';

import { FabricLookupEditPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricYarnFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function EditFabricYarnPage({ params }: { params: { id: string } }) {
  return <FabricLookupEditPage config={fabricYarnFormConfig} id={params.id} />;
}
