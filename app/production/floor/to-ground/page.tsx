'use client';

import React from 'react';
import { StationPage } from '../shared/StationPage';

/**
 * Maps final-QC bundles into a bundle container for the ground floor.
 */
export default function ToGroundPage() {
  return (
    <StationPage
      title="Move to ground"
      permission="Production / Move to ground"
      base="/production/to-ground"
      empty="No good bundle is waiting on a rack."
      miss="This bundle is not ready for the ground floor"
      start="none"
      place="container"
      stationLabel="Container"
    />
  );
}
