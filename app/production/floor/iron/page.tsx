'use client';

import React from 'react';
import { StationPage } from '../shared/StationPage';

/**
 * Ground-floor iron. Bundles arrive in a container and go back on a bundles rack.
 */
export default function IroningPage() {
  return (
    <StationPage
      title="Ironing"
      permission="Production / Ironing"
      base="/production/iron"
      empty="No bundle is in a container."
      miss="This bundle is not in a container for ironing"
      start="machine"
      place="bundles"
      stationLabel="Iron"
    />
  );
}
