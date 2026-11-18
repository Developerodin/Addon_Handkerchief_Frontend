'use client';

import React from 'react';
import { StationPage } from '../shared/StationPage';

/**
 * Iron after final QC. Bundles come from a bundles rack (physical move to iron is offline).
 */
export default function IroningPage() {
  return (
    <StationPage
      title="Ironing"
      permission="Production / Ironing"
      base="/production/iron"
      empty="No bundle is waiting on a rack after final QC."
      miss="This bundle is not ready for ironing after final QC"
      start="rack-machine"
      place="bundles"
      stationLabel="Iron"
    />
  );
}
