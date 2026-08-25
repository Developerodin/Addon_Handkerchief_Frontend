'use client';

import { FabricLookupEditPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricYarnCountFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function EditFabricYarnCountPage({ params }: { params: { id: string } }) {
  return <FabricLookupEditPage config={fabricYarnCountFormConfig} params={params} />;
}
