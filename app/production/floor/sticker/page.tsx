'use client';

import React from 'react';
import { StationPage } from '../shared/StationPage';

/**
 * Sticker for a broken bundle. No thread is recorded.
 */
export default function StickerPage() {
  return (
    <StationPage
      title="Sticker"
      permission="Production / Sticker"
      base="/production/sticker"
      empty="No sticker bundle is waiting on a rack."
      miss="This bundle is not for sticker"
      start="rack-machine"
      place="bundles"
      stationLabel="Table"
    />
  );
}
