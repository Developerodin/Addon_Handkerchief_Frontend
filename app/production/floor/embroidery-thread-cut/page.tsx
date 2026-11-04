'use client';

import React from 'react';
import { StationPage } from '../shared/StationPage';

/**
 * Thread cutting after embroidery. No thread quantity is stored.
 */
export default function EmbroideryThreadPage() {
  return (
    <StationPage
      title="Thread cutting after embroidery"
      permission="Production / Thread cutting after embroidery"
      base="/production/embroidery-thread-cut"
      empty="No embroidered bundle is waiting on a rack."
      miss="This bundle is not embroidered"
      start="rack-machine"
      place="bundles"
      stationLabel="Table"
    />
  );
}
