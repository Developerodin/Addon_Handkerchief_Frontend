'use client';

import React from 'react';
import { StationPage } from '../shared/StationPage';

/**
 * Breaks an ironed bundle. The piece count must match final QC, and the order picks the route.
 */
export default function RouteSplitPage() {
  return (
    <StationPage
      title="Bundle break"
      permission="Production / Route split"
      base="/production/route-split"
      empty="No ironed bundle is waiting on a rack."
      miss="This bundle is not ironed on a rack"
      start="none"
      place="count"
      stationLabel="Count"
    />
  );
}
