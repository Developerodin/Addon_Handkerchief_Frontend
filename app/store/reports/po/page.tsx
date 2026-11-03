import React, { Suspense } from 'react';
import PoAnalyticsScreen from './PoAnalyticsScreen';

/**
 * Purchase-order analytics. The screen reads its filters from the query string.
 */
export default function PoAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm font-medium text-[#57534E]" role="status">
          Loading purchase orders
        </p>
      }
    >
      <PoAnalyticsScreen />
    </Suspense>
  );
}
