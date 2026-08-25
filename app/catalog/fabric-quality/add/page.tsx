'use client';

import { FabricLookupAddPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricQualityFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function AddFabricQualityPage() {
  return <FabricLookupAddPage config={fabricQualityFormConfig} />;
}
