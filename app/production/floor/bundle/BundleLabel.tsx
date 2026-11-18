import React from 'react';
import { BundleLabel as SharedBundleLabel } from '@/shared/components/factory/BundleLabel';
import { BundleRow } from './types';

export function BundleLabel({ bundle, printing }: { bundle: BundleRow; printing: boolean }) {
  return <SharedBundleLabel bundle={bundle} printing={printing} />;
}
