'use client';

import { FabricLookupAddPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricYarnCountFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function AddFabricYarnCountPage() {
  return <FabricLookupAddPage config={fabricYarnCountFormConfig} />;
}
