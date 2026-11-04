'use client';

import React from 'react';
import { StationPage } from '../shared/StationPage';

/**
 * Embroidery for a broken bundle. Thread is recorded from the typed quantity.
 */
export default function EmbroideryPage() {
  return (
    <StationPage
      title="Embroidery"
      permission="Production / Embroidery"
      base="/production/embroidery"
      empty="No embroidery bundle is waiting on a rack."
      miss="This bundle is not for embroidery"
      start="rack-machine"
      place="bundles"
      stationLabel="Machine"
      thread
    />
  );
}
