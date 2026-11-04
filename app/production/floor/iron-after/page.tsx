'use client';

import React from 'react';
import { StationPage } from '../shared/StationPage';

/**
 * Second iron, after embroidery thread cutting or after sticker.
 */
export default function IronAfterPage() {
  return (
    <StationPage
      title="Ironing after route"
      permission="Production / Ironing after route"
      base="/production/iron-after"
      empty="No bundle is waiting for the second iron."
      miss="This bundle is not ready for the second iron"
      start="rack-machine"
      place="bundles"
      stationLabel="Iron"
    />
  );
}
