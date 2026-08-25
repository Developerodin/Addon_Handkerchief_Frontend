'use client';

import { FabricLookupAddPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricTypeFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function AddFabricTypePage() {
  return <FabricLookupAddPage config={fabricTypeFormConfig} />;
}
