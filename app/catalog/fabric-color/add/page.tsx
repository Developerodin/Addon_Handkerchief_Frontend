'use client';

import { FabricLookupAddPage } from '@/shared/components/catalog/FabricLookupFormPage';
import { fabricColorFormConfig } from '@/shared/config/fabricLookupConfigs';

export default function AddFabricColorPage() {
  return <FabricLookupAddPage config={fabricColorFormConfig} />;
}
