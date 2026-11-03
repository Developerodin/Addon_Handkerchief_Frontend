import React, { Suspense } from 'react';
import SupplierReportScreen from './SupplierReportScreen';

/**
 * Supplier ledger. The screen reads the open supplier from the query string.
 */
export default function SuppliersReportPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm font-medium text-gray-500" role="status">
          Loading suppliers
        </p>
      }
    >
      <SupplierReportScreen />
    </Suspense>
  );
}
