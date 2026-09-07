'use client';

import { FabricLookupAddPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricCountFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function AddFabricCountPage() {
  return <FabricLookupAddPage config={fabricCountFormConfig} />;
}
