'use client';

import { FabricLookupAddPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricYarnFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function AddFabricYarnPage() {
  return <FabricLookupAddPage config={fabricYarnFormConfig} />;
}
