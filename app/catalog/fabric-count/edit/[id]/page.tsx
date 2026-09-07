'use client';

import { FabricLookupEditPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricCountFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function EditFabricCountPage({ params }: { params: { id: string } }) {
  return <FabricLookupEditPage config={fabricCountFormConfig} id={params.id} />;
}
