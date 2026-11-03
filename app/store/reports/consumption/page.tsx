import React, { Suspense } from 'react';
import ConsumptionScreen from './ConsumptionScreen';

/**
 * Consumption report. The screen reads its filters from the query string.
 */
export default function ConsumptionReportPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm font-medium text-[#57534E]" role="status">
          Loading consumption
        </p>
      }
    >
      <ConsumptionScreen />
    </Suspense>
  );
}
